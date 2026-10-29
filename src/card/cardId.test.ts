import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RepeatGuard, tagIdToCardId, UsbReaderBuffer } from './cardId';

describe('tagIdToCardId', () => {
  it('upper-cases a hex id from the NFC chip', () => {
    assert.equal(tagIdToCardId('04a1b2c3'), '04A1B2C3');
  });

  it('turns a byte array into hex, two digits a byte', () => {
    assert.equal(tagIdToCardId([4, 161, 178, 195]), '04A1B2C3');
  });

  it('reads signed bytes (as Java hands them over) as 0–255', () => {
    assert.equal(tagIdToCardId([4, -95, -78, -61]), '04A1B2C3');
  });

  it('drops separators', () => {
    assert.equal(tagIdToCardId('04:a1:b2:c3'), '04A1B2C3');
    assert.equal(tagIdToCardId('04-A1 B2-C3'), '04A1B2C3');
  });

  it('has no id for nothing, an empty id or something that is not hex', () => {
    assert.equal(tagIdToCardId(undefined), null);
    assert.equal(tagIdToCardId(''), null);
    assert.equal(tagIdToCardId([]), null);
    assert.equal(tagIdToCardId('hello'), null);
  });
});

/** Feeds `text` one character at a time, `gapMs` apart, starting at `start`; returns every completed id. */
function typeOut(buffer: UsbReaderBuffer, text: string, start: number, gapMs: number): (string | null)[] {
  return [...text].map((ch, i) => buffer.push(ch, start + i * gapMs));
}

describe('UsbReaderBuffer', () => {
  it('completes a fast burst ending with Enter', () => {
    const buffer = new UsbReaderBuffer();
    const results = typeOut(buffer, '04A1B2C3\n', 1000, 8);
    assert.deepEqual(results.slice(0, -1), Array(8).fill(null));
    assert.equal(results.at(-1), '04A1B2C3');
  });

  it('completes a burst that arrives in one piece', () => {
    assert.equal(new UsbReaderBuffer().push('0004567890\r\n', 1000), '0004567890');
  });

  it('starts fresh after a completed read', () => {
    const buffer = new UsbReaderBuffer();
    assert.equal(buffer.push('04A1B2C3\n', 1000), '04A1B2C3');
    assert.equal(buffer.push('0004567890\n', 3000), '0004567890');
  });

  it('ignores slow typing by hand', () => {
    const buffer = new UsbReaderBuffer();
    // About 5 keys a second: every key comes long after the one before it.
    assert.deepEqual(typeOut(buffer, '04A1B2C3\n', 1000, 200), Array(9).fill(null));
  });

  it('ignores a burst with a hand-typed pause in it (more than 80 ms between keys)', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1', 1000, 8);
    assert.equal(buffer.push('B', 1024 + 100), null);
    assert.deepEqual(typeOut(buffer, '2C3\n', 1124 + 8, 8), [null, null, null, null]);
    // The next real read still works.
    assert.equal(buffer.push('04A1B2C3\n', 5000), '04A1B2C3');
  });

  it('completes a reader that sends no Enter after 120 ms of silence', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1B2C3', 1000, 8);
    // Last key at 1056.
    assert.equal(buffer.push('', 1056 + 100), null, 'not yet silent long enough');
    assert.equal(buffer.push('', 1056 + 121), '04A1B2C3');
    assert.equal(buffer.push('', 1056 + 400), null, 'completed only once');
  });

  it('completes the silent burst before starting on the next one', () => {
    const buffer = new UsbReaderBuffer();
    buffer.push('04A1B2C3', 1000);
    assert.equal(buffer.push('0', 2000), '04A1B2C3');
    assert.equal(buffer.push('004567890\n', 2005), '0004567890');
  });

  it('needs at least 4 characters', () => {
    const buffer = new UsbReaderBuffer();
    assert.equal(buffer.push('123\n', 1000), null);
    buffer.push('123', 2000);
    assert.equal(buffer.push('', 2200), null);
  });

  it('trims spaces and upper-cases hex letters', () => {
    assert.equal(new UsbReaderBuffer().push(' 04a1b2c3 \n', 1000), '04A1B2C3');
  });

  it('accepts only hex or decimal ids, nothing else a keyboard could type', () => {
    const buffer = new UsbReaderBuffer();
    assert.equal(buffer.push('HELLO123\n', 1000), null);
    assert.equal(buffer.push('04:A1:B2:C3\n', 2000), null);
    assert.equal(buffer.push('0004567890\n', 3000), '0004567890');
    assert.equal(buffer.push('abcdef12\n', 4000), 'ABCDEF12');
    buffer.push('ZZZZ9999', 5000);
    assert.equal(buffer.push('', 5200), null, 'not by silence either');
  });
});

describe('RepeatGuard', () => {
  it('lets a card through once, then ignores the same card for 2 s', () => {
    const guard = new RepeatGuard(2000);
    assert.equal(guard.accept('04A1B2C3', 1000), true);
    assert.equal(guard.accept('04A1B2C3', 2999), false);
    assert.equal(guard.accept('04A1B2C3', 5000), true);
  });

  it('lets a different card through at once', () => {
    const guard = new RepeatGuard(2000);
    assert.equal(guard.accept('04A1B2C3', 1000), true);
    assert.equal(guard.accept('0004567890', 1100), true);
  });

  it('keeps ignoring a card held against the reader', () => {
    const guard = new RepeatGuard(2000);
    guard.accept('04A1B2C3', 1000);
    guard.accept('04A1B2C3', 2500);
    assert.equal(guard.accept('04A1B2C3', 3200), false, 'the 2 s count again from the last read');
  });
});
