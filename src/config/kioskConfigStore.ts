import * as SecureStore from 'expo-secure-store';

export interface StoredKioskConfig {
  apiUrl: string;
  key: string;
}

export interface PrinterSettings {
  transport: 'usb' | 'network';
  usbDeviceId?: number;
  host?: string;
  port?: number;
}

const CONFIG_KEY = 'medios.kiosk.config';
const PRINTER_KEY = 'medios.kiosk.printer';

async function readJson<T>(name: string): Promise<T | null> {
  try {
    const raw = await SecureStore.getItemAsync(name);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function loadKioskConfig(): Promise<StoredKioskConfig | null> {
  const stored = await readJson<Partial<StoredKioskConfig>>(CONFIG_KEY);
  return stored?.apiUrl && stored.key ? { apiUrl: stored.apiUrl, key: stored.key } : null;
}

export const saveKioskConfig = (config: StoredKioskConfig): Promise<void> => SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify(config));

/** Forget the key but keep the address, so the setup screen is half filled in. */
export async function clearKioskKey(): Promise<void> {
  const stored = await readJson<Partial<StoredKioskConfig>>(CONFIG_KEY);
  if (stored?.apiUrl) await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify({ apiUrl: stored.apiUrl, key: '' }));
  else await SecureStore.deleteItemAsync(CONFIG_KEY);
}

/** The address of a kiosk that has no key any more (see `clearKioskKey`). */
export async function loadKioskAddress(): Promise<string> {
  return (await readJson<Partial<StoredKioskConfig>>(CONFIG_KEY))?.apiUrl ?? '';
}

export const loadPrinterSettings = (): Promise<PrinterSettings | null> => readJson<PrinterSettings>(PRINTER_KEY);

export const savePrinterSettings = (settings: PrinterSettings): Promise<void> => SecureStore.setItemAsync(PRINTER_KEY, JSON.stringify(settings));
