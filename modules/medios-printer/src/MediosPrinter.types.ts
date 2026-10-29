/** A connected USB device that looks like a printer (`listUsbPrinters`). */
export interface UsbPrinter {
  /** Android's id for this connection; it changes when the printer is plugged in again. */
  deviceId: number;
  name: string;
  vendorId: number;
  productId: number;
  /** False until someone allows access (Android asks on the first print). */
  hasPermission: boolean;
}

export interface MediosPrinterApi {
  listUsbPrinters(): Promise<UsbPrinter[]>;
  /** The first printer when `deviceId` is null (or no longer connected). */
  printUsb(deviceId: number | null, base64: string): Promise<void>;
  printNetwork(host: string, port: number, base64: string, timeoutMs: number): Promise<void>;
}
