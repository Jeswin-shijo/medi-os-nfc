import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { RepeatGuard, SILENCE_MS, tagIdToCardId, UsbReaderBuffer } from './cardId';

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

/** When the reader field checks for silence after a key (UsbReaderInput). */
const CHECK_MS = SILENCE_MS + 20;

/**
 * Like the reader field on a busy JS thread: each key reaches the app `gapMs` after the one before, and the
 * field's silence check (CHECK_MS after a key) runs in between whenever the gap is longer. Returns every id completed.
 */
function typeSlowly(buffer: UsbReaderBuffer, text: string, start: number, gapMs: number): string[] {
  const ids: string[] = [];
  const keep = (id: string | null) => {
    if (id !== null) ids.push(id);
  };
  [...text].forEach((ch, i) => {
    const at = start + i * gapMs;
    keep(buffer.push(ch, at));
    if (gapMs > CHECK_MS && i < text.length - 1) keep(buffer.push('', at + CHECK_MS));
  });
  return ids;
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

  it('never takes slow typing without Enter', () => {
    const buffer = new UsbReaderBuffer();
    // About 5 keys a second, then nothing: a person at a keyboard.
    assert.deepEqual(typeSlowly(buffer, '04A1B2C3', 1000, 200), []);
    assert.equal(buffer.push('', 1000 + 7 * 200 + CHECK_MS), null);
    assert.equal(buffer.push('', 1000 + 7 * 200 + 1100), null);
  });

  it('ignores a silence-ended burst with a hand-typed pause in it (more than 80 ms between keys)', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1', 1000, 8);
    assert.equal(buffer.push('B', 1024 + 100), null);
    typeOut(buffer, '2C3', 1124 + 8, 8);
    assert.equal(buffer.push('', 1148 + CHECK_MS), null, 'no Enter: the 80 ms rule applies');
    // The next real read still works.
    assert.equal(buffer.push('04A1B2C3\n', 5000), '04A1B2C3');
  });

  it('accepts an id ending in Enter whatever the gaps between its keys (the app was busy), from the first card', () => {
    // 100 ms apart: over the 80 ms hand-typing rule, under the silence.
    const results = typeOut(new UsbReaderBuffer(), '04A1B2C3\n', 1000, 100);
    assert.deepEqual(results.slice(0, -1), Array(8).fill(null));
    assert.equal(results.at(-1), '04A1B2C3');
    // 150, 220 and 700 ms apart (the last with the silence check running between the keys).
    assert.deepEqual(typeSlowly(new UsbReaderBuffer(), '04A1B2C3\n', 1000, 150), ['04A1B2C3']);
    assert.deepEqual(typeSlowly(new UsbReaderBuffer(), '0004567890\n', 1000, 220), ['0004567890']);
    assert.deepEqual(typeSlowly(new UsbReaderBuffer(), '0004567890\n', 1000, 700), ['0004567890']);
  });

  it('does not split an id whose keys stall for a moment before any Enter has been seen (the first card after setup)', () => {
    // The app is busy just after the setup link: '04A1' arrives, then nothing for 250 ms, then 'B2C3' and Enter.
    // It was completed by silence as '04A1' ("This card isn't linked yet"), and only the next tap worked.
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1', 1000, 4);
    assert.equal(buffer.push('', 1012 + 250), null, 'a stall is not the end of an id');
    assert.equal(buffer.push('B2C3\n', 1012 + 260), '04A1B2C3');
  });

  it('accepts a slow id whose Enter comes late', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1B2C3', 1000, 100);
    // Last key at 1700; the silence check finds a slow burst and waits.
    assert.equal(buffer.push('', 1700 + CHECK_MS), null);
    assert.equal(buffer.push('\n', 1700 + 900), '04A1B2C3');
  });

  it('drops a slow burst that ends in silence (no Enter)', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1B2C3', 1000, 100);
    // Last key at 1700.
    assert.equal(buffer.push('', 1700 + CHECK_MS), null);
    assert.equal(buffer.push('', 1700 + 1100), null);
  });

  it('never joins keys left over for more than a second to the next card', () => {
    const buffer = new UsbReaderBuffer();
    typeSlowly(buffer, '12', 1000, 200);
    assert.equal(buffer.push('04A1B2C3\n', 3000), '04A1B2C3');
    // Also once the reader is known to send Enter.
    typeOut(buffer, '0004', 4000, 8);
    assert.equal(buffer.push('567890\n', 6000), '567890');
  });

  it('once the reader has ended an id with Enter, a pause no longer ends a burst (a stall cannot split an id)', () => {
    const buffer = new UsbReaderBuffer();
    assert.equal(buffer.push('04A1B2C3\n', 1000), '04A1B2C3');
    typeOut(buffer, '0004', 3000, 8);
    // The JS thread stalls for 300 ms: the silence check finds nothing to complete.
    assert.equal(buffer.push('', 3024 + 300), null);
    assert.equal(buffer.push('567890\n', 3024 + 320), '0004567890');
  });

  it('once the reader has ended an id with Enter, keys of any pace are one burst up to the Enter', () => {
    const buffer = new UsbReaderBuffer();
    buffer.push('0004567890\n', 1000);
    assert.deepEqual(typeSlowly(buffer, '04A1B2C3\n', 3000, 250), ['04A1B2C3']);
  });

  it('learns that the reader sends Enter only from a real id', () => {
    const buffer = new UsbReaderBuffer();
    assert.equal(buffer.push('HELLO\n', 1000), null);
    buffer.push('04A1B2C3', 2000);
    assert.equal(buffer.push('', 2000 + CHECK_MS), '04A1B2C3', 'silence still ends a burst');
  });

  it('remembers across buffers that share what was learnt (each screen has its own buffer)', () => {
    const habits = { sendsEnter: false };
    assert.equal(new UsbReaderBuffer(habits).push('04A1B2C3\n', 1000), '04A1B2C3');
    const next = new UsbReaderBuffer(habits);
    typeOut(next, '0004', 3000, 8);
    assert.equal(next.push('', 3024 + 300), null);
    assert.equal(next.push('567890\n', 3024 + 320), '0004567890');
    // A buffer of its own learns nothing from the others.
    const other = new UsbReaderBuffer();
    other.push('0004', 5000);
    assert.equal(other.push('', 5000 + CHECK_MS), '0004');
  });

  it('completes a reader that sends no Enter after 600 ms of silence', () => {
    const buffer = new UsbReaderBuffer();
    typeOut(buffer, '04A1B2C3', 1000, 8);
    // Last key at 1056.
    assert.equal(buffer.push('', 1056 + 300), null, 'not yet silent long enough');
    assert.equal(buffer.push('', 1056 + 601), '04A1B2C3');
    assert.equal(buffer.push('', 1056 + 900), null, 'completed only once');
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
    assert.equal(buffer.push('', 2000 + CHECK_MS), null);
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
    const quiet = new UsbReaderBuffer();
    quiet.push('ZZZZ9999', 5000);
    assert.equal(quiet.push('', 5000 + CHECK_MS), null, 'not by silence either');
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
