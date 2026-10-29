import { NativeModule, requireOptionalNativeModule } from 'expo';
import type { MediosPrinterApi, UsbPrinter } from './MediosPrinter.types';

declare class MediosPrinterNative extends NativeModule implements MediosPrinterApi {
  listUsbPrinters(): Promise<UsbPrinter[]>;
  printUsb(deviceId: number | null, base64: string): Promise<void>;
  printNetwork(host: string, port: number, base64: string, timeoutMs: number): Promise<void>;
}

// Android only. Elsewhere (iOS, web, a build without the module) every call rejects instead of
// the app failing on import.
const native = requireOptionalNativeModule<MediosPrinterNative>('MediosPrinter');

const unsupported = (): Promise<never> => Promise.reject(new Error('Printing is not supported on this device.'));

const MediosPrinter: MediosPrinterApi = {
  listUsbPrinters: () => (native ? native.listUsbPrinters() : unsupported()),
  printUsb: (deviceId, base64) => (native ? native.printUsb(deviceId, base64) : unsupported()),
  printNetwork: (host, port, base64, timeoutMs) => (native ? native.printNetwork(host, port, base64, timeoutMs) : unsupported()),
};

export default MediosPrinter;
