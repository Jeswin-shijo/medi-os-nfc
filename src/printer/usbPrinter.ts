// Which connected USB device the slip goes to. No react-native imports: tested in plain Node.
import type { UsbPrinter } from '../../modules/medios-printer/src/MediosPrinter.types';
import type { PrinterSettings, UsbPrinterIdentity } from '../config/kioskConfigStore';

export type UsbTarget = { ok: true; deviceId: number } | { ok: false; reason: string };

/** The identity to save for a printer staff picked from `listUsbPrinters()`. */
export function usbIdentity(printer: UsbPrinter): UsbPrinterIdentity {
  const identity: UsbPrinterIdentity = { vendorId: printer.vendorId, productId: printer.productId };
  if (printer.serial) identity.serial = printer.serial;
  return identity;
}

/**
 * Printer settings for a printer staff picked (the staff printer screen saves these). Pick it after
 * a test print, so Android has granted access and the serial is part of the identity.
 */
export const usbPrinterSettings = (printer: UsbPrinter): PrinterSettings => ({ transport: 'usb', usbPrinter: usbIdentity(printer) });

const ONE_PRINTER = (count: number): string =>
  count === 0 ? 'No USB printer is connected.' : 'More than one USB printer is connected. Choose one in the staff menu.';

/**
 * The device a patient's slip may go to, by this connection's device id. Only printer-class
 * devices, and never another device than the chosen one: a slip must not end up on a network
 * adapter or a flash drive in the same hub. With nothing chosen yet, only when exactly one
 * printer-class device is connected.
 */
export function resolveUsbPrinter(devices: UsbPrinter[], chosen: UsbPrinterIdentity | null | undefined): UsbTarget {
  const printers = devices.filter((d) => d.printerClass);
  if (!chosen) return printers.length === 1 ? { ok: true, deviceId: printers[0].deviceId } : { ok: false, reason: ONE_PRINTER(printers.length) };

  const sameModel = printers.filter((d) => d.vendorId === chosen.vendorId && d.productId === chosen.productId);
  let matches = sameModel;
  if (chosen.serial) {
    const exact = sameModel.filter((d) => d.serial === chosen.serial);
    // Android hides the serial until the kiosk may use the device (after a re-plug, say):
    // then the one same-model printer whose serial is unreadable is taken to be the chosen one.
    matches = exact.length ? exact : sameModel.filter((d) => !d.serial);
  }
  if (matches.length === 1) return { ok: true, deviceId: matches[0].deviceId };
  return {
    ok: false,
    reason: matches.length === 0 ? 'The chosen USB printer is not connected.' : 'Two printers look like the chosen one. Choose one in the staff menu.',
  };
}

/** The saved printer among the printer-class devices connected now, for the staff printer screen. */
export type SavedPrinterStatus =
  | 'none' // nothing saved
  | 'connected' // the saved printer is connected (its serial may not be readable yet)
  | 'different-serial' // a printer of the saved model is connected, but its serial is another one
  | 'not-connected';

const sameModel = (device: UsbPrinter, saved: UsbPrinterIdentity): boolean => device.vendorId === saved.vendorId && device.productId === saved.productId;

/** True when `device` is the saved printer: same model, and the same serial where both are known. */
export function isSavedPrinter(device: UsbPrinter, saved: UsbPrinterIdentity | null | undefined): boolean {
  if (!saved || !device.printerClass || !sameModel(device, saved)) return false;
  return !saved.serial || !device.serial || device.serial === saved.serial;
}

export function savedPrinterStatus(devices: UsbPrinter[], saved: UsbPrinterIdentity | null | undefined): SavedPrinterStatus {
  if (!saved) return 'none';
  const printers = devices.filter((d) => d.printerClass);
  if (printers.some((d) => isSavedPrinter(d, saved))) return 'connected';
  return printers.some((d) => sameModel(d, saved)) ? 'different-serial' : 'not-connected';
}
