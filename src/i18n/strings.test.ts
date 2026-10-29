import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { strings } from './strings';

describe('room wording', () => {
  it("does not put 'Room' in front of a room that already says it", () => {
    const label = strings.doctor.cardLabel('Dr. Shajin', 'MBBS', 300, 'Room 101', 'Available now', true);
    assert.ok(label.includes(', Room 101,'));
    assert.ok(!/room room/i.test(label));
  });
});
