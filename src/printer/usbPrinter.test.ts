import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { UsbPrinter } from '../../modules/medios-printer/src/MediosPrinter.types';
import { isSavedPrinter, resolveUsbPrinter, savedPrinterStatus, usbIdentity, usbPrinterSettings } from './usbPrinter';

const EPSON = { vendorId: 0x04b8, productId: 0x0202 };
const TVS = { vendorId: 0x0fe6, productId: 0x811e };

const device = (over: Partial<UsbPrinter> & { deviceId: number }): UsbPrinter => ({
  name: 'EPSON TM-T82',
  ...EPSON,
  hasPermission: true,
  printerClass: true,
  serial: null,
  ...over,
});

describe('usbIdentity and usbPrinterSettings (for the staff printer screen)', () => {
  it("keeps the printer's vendor, product and serial, never Android's passing device id", () => {
    const chosen = device({ deviceId: 1003, serial: 'X5E1234567' });
    assert.deepEqual(usbIdentity(chosen), { vendorId: EPSON.vendorId, productId: EPSON.productId, serial: 'X5E1234567' });
    assert.deepEqual(usbPrinterSettings(chosen), { transport: 'usb', usbPrinter: usbIdentity(chosen) });
  });

  it('leaves the serial out when Android could not read it', () => {
    assert.deepEqual(usbIdentity(device({ deviceId: 1, serial: null })), { ...EPSON });
    assert.deepEqual(usbIdentity(device({ deviceId: 1, serial: '' })), { ...EPSON });
  });
});

describe('resolveUsbPrinter', () => {
  const saved = { ...EPSON, serial: 'X5E1234567' };

  it('finds the chosen printer under its new device id after a re-plug or reboot', () => {
    const result = resolveUsbPrinter([device({ deviceId: 2007, serial: 'X5E1234567' })], saved);
    assert.deepEqual(result, { ok: true, deviceId: 2007 });
  });

  it('never prints to another device when the chosen printer is not connected', () => {
    const other = device({ deviceId: 5, name: 'TVS RP 3160', ...TVS });
    const result = resolveUsbPrinter([other], saved);
    assert.equal(result.ok, false);
  });

  it('only ever prints to a printer-class device, even when vendor and product match', () => {
    const bulkOnly = device({ deviceId: 9, printerClass: false, serial: 'X5E1234567' });
    assert.equal(resolveUsbPrinter([bulkOnly], saved).ok, false);
    assert.equal(resolveUsbPrinter([bulkOnly], null).ok, false);
  });

  it('tells two printers of the same model apart by serial', () => {
    const mine = device({ deviceId: 11, serial: 'X5E1234567' });
    const theirs = device({ deviceId: 12, serial: 'X5E7654321' });
    assert.deepEqual(resolveUsbPrinter([theirs, mine], saved), { ok: true, deviceId: 11 });
  });

  it('refuses a different unit of the same model (staff choose the new printer)', () => {
    assert.equal(resolveUsbPrinter([device({ deviceId: 11, serial: 'X5E0000000' })], saved).ok, false);
  });

  it('accepts the one same-model printer whose serial cannot be read yet (no permission after a re-plug)', () => {
    const unreadable = device({ deviceId: 21, hasPermission: false, serial: null });
    const otherUnit = device({ deviceId: 22, serial: 'X5E0000000' });
    assert.deepEqual(resolveUsbPrinter([otherUnit, unreadable], saved), { ok: true, deviceId: 21 });
  });

  it('refuses when two same-model printers both hide their serial', () => {
    const a = device({ deviceId: 31, hasPermission: false, serial: null });
    const b = device({ deviceId: 32, hasPermission: false, serial: null });
    assert.equal(resolveUsbPrinter([a, b], saved).ok, false);
  });

  it('without a saved serial, needs exactly one printer of the chosen model', () => {
    const noSerial = { ...EPSON };
    assert.deepEqual(resolveUsbPrinter([device({ deviceId: 41 })], noSerial), { ok: true, deviceId: 41 });
    assert.equal(resolveUsbPrinter([device({ deviceId: 41 }), device({ deviceId: 42 })], noSerial).ok, false);
  });

  describe('when no printer has been chosen yet', () => {
    it('uses the one printer-class device when exactly one is connected', () => {
      const flashDrive = device({ deviceId: 50, name: 'USB DISK', vendorId: 0x0781, productId: 0x5567, printerClass: false });
      assert.deepEqual(resolveUsbPrinter([flashDrive, device({ deviceId: 51 })], null), { ok: true, deviceId: 51 });
      assert.deepEqual(resolveUsbPrinter([device({ deviceId: 52 })], undefined), { ok: true, deviceId: 52 });
    });

    it('refuses with none, or with more than one', () => {
      assert.equal(resolveUsbPrinter([], null).ok, false);
      assert.equal(resolveUsbPrinter([device({ deviceId: 61 }), device({ deviceId: 62, ...TVS })], null).ok, false);
    });
  });

  it('explains every refusal in words', () => {
    for (const result of [resolveUsbPrinter([], saved), resolveUsbPrinter([], null)]) {
      assert.ok(!result.ok && result.reason.length > 0);
    }
  });
});

describe('savedPrinterStatus and isSavedPrinter (staff printer screen)', () => {
  const saved = { ...EPSON, serial: 'AAA' };

  it('says none when nothing is saved', () => {
    assert.equal(savedPrinterStatus([device({ deviceId: 1 })], null), 'none');
  });

  it('finds the saved printer by its serial, not its device id', () => {
    const list = [device({ deviceId: 7, serial: 'BBB' }), device({ deviceId: 8, serial: 'AAA' })];
    assert.equal(savedPrinterStatus(list, saved), 'connected');
    assert.equal(isSavedPrinter(list[0], saved), false);
    assert.equal(isSavedPrinter(list[1], saved), true);
  });

  it('takes a same-model printer whose serial is not readable yet as the saved one', () => {
    assert.equal(savedPrinterStatus([device({ deviceId: 7, serial: null })], saved), 'connected');
  });

  it('reports a different serial of the same model', () => {
    assert.equal(savedPrinterStatus([device({ deviceId: 7, serial: 'BBB' })], saved), 'different-serial');
  });

  it('reports not connected for another model or a non-printer device', () => {
    assert.equal(savedPrinterStatus([device({ deviceId: 7, ...TVS })], saved), 'not-connected');
    assert.equal(savedPrinterStatus([device({ deviceId: 7, serial: 'AAA', printerClass: false })], saved), 'not-connected');
    assert.equal(savedPrinterStatus([], saved), 'not-connected');
  });
});
