// The staff "Test print" slip. No react-native imports: tested in plain Node.
import { EscPos } from './escpos';

/** A short slip that proves the printer works: 'MediOS kiosk test print' and the time. */
export function buildTestSlip(timeText: string): Uint8Array {
  return new EscPos()
    .init()
    .align('center')
    .bold(true)
    .size(2, 2)
    .line('MediOS kiosk test print')
    .size(1, 1)
    .bold(false)
    .rule()
    .line(timeText)
    .feed(1)
    .cut()
    .bytes();
}
