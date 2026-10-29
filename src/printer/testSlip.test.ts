import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildTestSlip } from './testSlip';

describe('buildTestSlip', () => {
  it('prints the words and the time, then cuts', () => {
    const bytes = buildTestSlip('30 Oct 2026, 10:24 AM');
    const text = Buffer.from(bytes).toString('latin1');
    assert.ok(text.includes('MediOS kiosk test print'));
    assert.ok(text.includes('30 Oct 2026, 10:24 AM'));
    assert.deepEqual(Array.from(bytes.slice(-4)), [0x1d, 0x56, 0x42, 0x00]);
  });
});
