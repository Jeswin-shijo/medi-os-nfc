import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { COLUMNS, EscPos, printable, toBase64 } from './escpos';

const hex = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex').toUpperCase().replace(/(..)(?!$)/g, '$1 ');
const ascii = (bytes: Uint8Array): string => Buffer.from(bytes).toString('latin1');

describe('EscPos', () => {
  it('produces the exact bytes for init, centre, bold, text and cut', () => {
    const bytes = new EscPos().init().align('center').bold(true).text('A').cut().bytes();
    assert.equal(hex(bytes), '1B 40 1B 61 01 1B 45 01 41 1D 56 42 00');
  });

  it('aligns left, centre and right, and switches bold off', () => {
    const bytes = new EscPos().align('left').align('right').bold(false).bytes();
    assert.equal(hex(bytes), '1B 61 00 1B 61 02 1B 45 00');
  });

  it('sets the character size as GS ! ((w-1)<<4 | (h-1))', () => {
    assert.equal(hex(new EscPos().size(1, 1).bytes()), '1D 21 00');
    assert.equal(hex(new EscPos().size(2, 2).bytes()), '1D 21 11');
    assert.equal(hex(new EscPos().size(3, 1).bytes()), '1D 21 20');
    assert.equal(hex(new EscPos().size(1, 3).bytes()), '1D 21 02');
  });

  it('ends a line with LF, feeds n lines and draws a 48-column rule', () => {
    assert.equal(hex(new EscPos().line('Hi').bytes()), '48 69 0A');
    assert.equal(hex(new EscPos().line().bytes()), '0A');
    assert.equal(hex(new EscPos().feed(3).bytes()), '1B 64 03');
    assert.equal(ascii(new EscPos().rule().bytes()), `${'-'.repeat(COLUMNS)}\n`);
    assert.equal(ascii(new EscPos().rule('=').bytes()), `${'='.repeat(48)}\n`);
  });

  it('prints the rupee sign as Rs. (printers have no rupee glyph)', () => {
    assert.equal(ascii(new EscPos().text('₹300').bytes()), 'Rs.300');
  });

  it('turns other non-ASCII characters into ?, one per character', () => {
    assert.equal(ascii(new EscPos().text('Room 101 · Dr. Shajin').bytes()), 'Room 101 ? Dr. Shajin');
    assert.equal(ascii(new EscPos().text('ரமேஷ்').bytes()), '?????');
    assert.equal(ascii(new EscPos().text('ok 👍').bytes()), 'ok ?');
  });

  it('never lets text carry printer commands (control characters become ?)', () => {
    const bytes = new EscPos().text('A\x1b@B\nC\x1dV').bytes();
    assert.equal(ascii(bytes), 'A?@B?C?V');
    assert.ok(!bytes.includes(0x1b) && !bytes.includes(0x1d) && !bytes.includes(0x0a));
  });

  describe('qr', () => {
    const url = 'https://medios.example/track#ABCDEFGH123'; // 40 characters

    it('selects model 2, module size, error level M, stores the data and prints it', () => {
      assert.equal(url.length, 40);
      const bytes = new EscPos().qr(url).bytes();
      const head = hex(bytes.slice(0, 9 + 8 + 8));
      assert.equal(head, '1D 28 6B 04 00 31 41 32 00 1D 28 6B 03 00 31 43 06 1D 28 6B 03 00 31 45 31');
      const store = bytes.slice(25, 25 + 8);
      assert.equal(hex(store), '1D 28 6B 2B 00 31 50 30', 'pL = 40 + 3 = 43 (0x2B), pH = 0');
      assert.equal(ascii(bytes.slice(33, 33 + 40)), url);
      assert.equal(hex(bytes.slice(73)), '1D 28 6B 03 00 31 51 30');
      assert.equal(bytes.length, 73 + 8);
    });

    it('uses the module size given', () => {
      const bytes = new EscPos().qr('x', 8).bytes();
      assert.equal(bytes[16], 8);
    });

    it('writes the store length little-endian when it passes 255', () => {
      const data = 'a'.repeat(300);
      const bytes = new EscPos().qr(data).bytes();
      // 303 = 0x012F
      assert.equal(hex(bytes.slice(25, 33)), '1D 28 6B 2F 01 31 50 30');
    });
  });
});

describe('printable', () => {
  it('is the text exactly as the printer will show it', () => {
    assert.equal(printable('Fee ₹300 · UPI'), 'Fee Rs.300 ? UPI');
    assert.equal(printable('plain ASCII stays'), 'plain ASCII stays');
  });
});

describe('toBase64', () => {
  it('matches the standard alphabet and padding', () => {
    for (const sample of ['', 'M', 'Ma', 'Man', 'hello world', '\x1b@\x1dVB\x00\xff\xfe']) {
      const bytes = Uint8Array.from(Buffer.from(sample, 'latin1'));
      assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'), JSON.stringify(sample));
    }
  });

  it('encodes a whole ticket the same way Node does', () => {
    const bytes = new EscPos().init().line('OP-20260926-0042').qr('https://medios.example/track#X').cut().bytes();
    assert.equal(toBase64(bytes), Buffer.from(bytes).toString('base64'));
  });
});
