import MediosPrinter, { type UsbPrinter } from '../../modules/medios-printer';
import type { PrinterSettings } from '../config/kioskConfigStore';
import { toBase64 } from './escpos';
import { resolveUsbPrinter } from './usbPrinter';

export type PrintResult = { ok: true } | { ok: false; reason: string };
export type { UsbPrinter };

const DEFAULT_PORT = 9100;
const NETWORK_TIMEOUT_MS = 5000;
/** Waits before the second and third attempts. */
const RETRY_DELAYS_MS = [1000, 2000];
/** Asking again would only show Android's permission dialog again: the answer was no (or nobody answered). */
const NO_RETRY_CODES = new Set(['ERR_USB_PERMISSION']);

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const failureOf = (err: unknown): { reason: string; code?: string } => {
  const e = err as { message?: unknown; code?: unknown } | null;
  return {
    reason: typeof e?.message === 'string' && e.message ? e.message : 'The printer did not answer.',
    code: typeof e?.code === 'string' ? e.code : undefined,
  };
};

/**
 * Sends a slip to the kiosk's printer: three attempts (1 s, then 2 s apart). Never throws.
 * USB finds the chosen printer again on every attempt (its device id changes when it is plugged
 * in again) and fails rather than print anywhere else.
 */
export async function printTicket(bytes: Uint8Array, settings: PrinterSettings): Promise<PrintResult> {
  if (settings.transport === 'network' && !settings.host) return { ok: false, reason: 'No printer address is set.' };
  const base64 = toBase64(bytes);
  const send = async () => {
    if (settings.transport === 'network') {
      return MediosPrinter.printNetwork(settings.host ?? '', settings.port ?? DEFAULT_PORT, base64, NETWORK_TIMEOUT_MS);
    }
    const target = resolveUsbPrinter(await MediosPrinter.listUsbPrinters(), settings.usbPrinter);
    if (!target.ok) throw new Error(target.reason);
    return MediosPrinter.printUsb(target.deviceId, base64);
  };

  let failure = failureOf(null);
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) await sleep(RETRY_DELAYS_MS[attempt - 1]);
    try {
      await send();
      return { ok: true };
    } catch (err) {
      failure = failureOf(err);
      if (failure.code && NO_RETRY_CODES.has(failure.code)) break;
    }
  }
  return { ok: false, reason: failure.reason };
}

/** USB devices that look like printers (for the staff printer screen; save the pick with `usbPrinterSettings`). */
export const listUsbPrinters = (): Promise<UsbPrinter[]> => MediosPrinter.listUsbPrinters();
