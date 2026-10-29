import { create } from 'zustand';
import { createKioskClient, KioskApiError, type KioskClient } from '../api/client';
import { kioskApi, type KioskApi } from '../api/kiosk';
import type { KioskConfig } from '../api/types';
import {
  clearKioskKey,
  loadKioskAddress,
  loadKioskConfig,
  saveKioskConfig,
  savePrinterSettings,
  type StoredKioskConfig,
} from '../config/kioskConfigStore';
import { strings } from '../i18n/strings';

type Status = 'loading' | 'unconfigured' | 'offline' | 'ready';

interface KioskAppState {
  status: Status;
  config: KioskConfig | null;
  client: KioskClient | null;
  api: KioskApi | null;
  /** Shown on the setup screen (for example after the key was revoked). */
  notice: string | null;
  /** Message of the last failed load when the server could not be reached. */
  loadError: string | null;
  /** Address to prefill on the setup screen. */
  address: string;
  /** Load the stored settings and ask the server for the kiosk configuration. */
  reload: () => Promise<void>;
  /** Try new settings; stores them only when the server accepts the key. Throws KioskApiError. */
  connect: (settings: StoredKioskConfig, printer?: { host: string; port: number }) => Promise<void>;
}

export const useKioskApp = create<KioskAppState>((set, get) => {
  /** A client that sends the kiosk back to setup the moment the server stops accepting its key. */
  function watchedClient(settings: StoredKioskConfig): KioskClient {
    const inner = createKioskClient(settings);
    const guard = async <T>(call: Promise<T>): Promise<T> => {
      try {
        return await call;
      } catch (err) {
        if (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED') await revoke(settings.apiUrl);
        throw err;
      }
    };
    return { get: (path) => guard(inner.get(path)), post: (path, body) => guard(inner.post(path, body)) };
  }

  async function revoke(apiUrl: string): Promise<void> {
    await clearKioskKey().catch(() => undefined);
    set({ status: 'unconfigured', config: null, client: null, api: null, notice: strings.errors.revoked, address: apiUrl });
  }

  async function open(settings: StoredKioskConfig): Promise<void> {
    const client = watchedClient(settings);
    const api = kioskApi(client);
    const config = await api.config();
    set({ status: 'ready', config, client, api, notice: null, loadError: null, address: settings.apiUrl });
  }

  return {
    status: 'loading',
    config: null,
    client: null,
    api: null,
    notice: null,
    loadError: null,
    address: '',

    async reload() {
      const stored = await loadKioskConfig();
      if (!stored) {
        set({ status: 'unconfigured', config: null, client: null, api: null, address: await loadKioskAddress() });
        return;
      }
      try {
        await open(stored);
      } catch (err) {
        // A revoked key already moved the state to setup (see watchedClient).
        if (err instanceof KioskApiError && err.code === 'NETWORK') set({ status: 'offline', loadError: err.message });
        else if (get().status !== 'unconfigured') set({ status: 'offline', loadError: err instanceof Error ? err.message : strings.errors.generic });
      }
    },

    async connect(settings, printer) {
      // Not watched: a wrong key typed on the setup screen is an ordinary error there.
      const config = await kioskApi(createKioskClient(settings)).config();
      await saveKioskConfig(settings);
      if (printer) await savePrinterSettings({ transport: 'network', host: printer.host, port: printer.port });
      const client = watchedClient(settings);
      set({ status: 'ready', config, client, api: kioskApi(client), notice: null, loadError: null, address: settings.apiUrl });
    },
  };
});
