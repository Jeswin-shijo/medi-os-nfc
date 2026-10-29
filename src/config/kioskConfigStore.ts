import * as SecureStore from 'expo-secure-store';

export interface StoredKioskConfig {
  apiUrl: string;
  key: string;
}

/**
 * The USB printer staff chose, as the printer itself reports it. Android gives a device a new id
 * on every re-plug and reboot, so the printer is found again by these, never by that id.
 */
export interface UsbPrinterIdentity {
  vendorId: number;
  productId: number;
  /** Readable once the kiosk may use the printer; tells two printers of one model apart. */
  serial?: string;
}

export interface PrinterSettings {
  transport: 'usb' | 'network';
  /** USB: the chosen printer. None saved: the one printer-class device, when exactly one is connected. */
  usbPrinter?: UsbPrinterIdentity;
  host?: string;
  port?: number;
}

const CONFIG_KEY = 'medios.kiosk.config';
const PRINTER_KEY = 'medios.kiosk.printer';
const SOUNDS_KEY = 'medios.kiosk.sounds';

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

/**
 * Forget the key but keep the address (a kiosk that was set up once never gets the open form
 * back). With `only`, the key goes only if it is still that one: a newer key stays.
 */
export async function clearKioskKey(only?: StoredKioskConfig): Promise<void> {
  const stored = await readJson<Partial<StoredKioskConfig>>(CONFIG_KEY);
  if (only && !(stored?.apiUrl === only.apiUrl && stored.key === only.key)) return;
  if (stored?.apiUrl) await SecureStore.setItemAsync(CONFIG_KEY, JSON.stringify({ apiUrl: stored.apiUrl, key: '' }));
  else await SecureStore.deleteItemAsync(CONFIG_KEY);
}

/** The address of a kiosk that has no key any more (see `clearKioskKey`). */
export async function loadKioskAddress(): Promise<string> {
  return (await readJson<Partial<StoredKioskConfig>>(CONFIG_KEY))?.apiUrl ?? '';
}

export const loadPrinterSettings = (): Promise<PrinterSettings | null> => readJson<PrinterSettings>(PRINTER_KEY);

export const savePrinterSettings = (settings: PrinterSettings): Promise<void> => SecureStore.setItemAsync(PRINTER_KEY, JSON.stringify(settings));

/** Feedback chimes; staff switch them off in the staff menu. On unless saved as off. */
export async function loadSoundsOn(): Promise<boolean> {
  return (await readJson<boolean>(SOUNDS_KEY)) !== false;
}

export const saveSoundsOn = (on: boolean): Promise<void> => SecureStore.setItemAsync(SOUNDS_KEY, JSON.stringify(on));
