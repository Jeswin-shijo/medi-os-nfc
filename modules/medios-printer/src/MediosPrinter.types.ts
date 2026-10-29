/** A connected USB device that looks like a printer (`listUsbPrinters`). */
export interface UsbPrinter {
  /** Android's id for this connection; it changes on every re-plug and reboot. */
  deviceId: number;
  name: string;
  vendorId: number;
  productId: number;
  /** False until someone allows access (Android asks on the first print). */
  hasPermission: boolean;
  /**
   * Has a printer-class (7) interface. Only these are ever printed to; the others are listed
   * (staff only) because some slip printers report a vendor-specific class.
   */
  printerClass: boolean;
  /** Null until the kiosk may use the device (Android hides it before that). */
  serial: string | null;
}

export interface MediosPrinterApi {
  listUsbPrinters(): Promise<UsbPrinter[]>;
  /** Prints only to that device, and only if it is a printer-class device; never chooses another. */
  printUsb(deviceId: number, base64: string): Promise<void>;
  printNetwork(host: string, port: number, base64: string, timeoutMs: number): Promise<void>;
}
