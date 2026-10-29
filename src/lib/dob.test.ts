import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDob } from './dob';

const TODAY = new Date('2026-09-26T10:00:00Z');

describe('parseDob', () => {
  it('turns day, month and year into YYYY-MM-DD', () => {
    assert.equal(parseDob('5', '3', '1990', TODAY), '1990-03-05');
    assert.equal(parseDob('05', '03', '1990', TODAY), '1990-03-05');
  });
  it('accepts a real leap day and rejects an invented one', () => {
    assert.equal(parseDob('29', '2', '2000', TODAY), '2000-02-29');
    assert.equal(parseDob('29', '2', '2001', TODAY), null);
    assert.equal(parseDob('31', '4', '1990', TODAY), null);
  });
  it('rejects incomplete, future and implausibly old dates', () => {
    assert.equal(parseDob('', '3', '1990', TODAY), null);
    assert.equal(parseDob('5', '3', '90', TODAY), null);
    assert.equal(parseDob('27', '9', '2026', TODAY), null);
    assert.equal(parseDob('5', '3', '1890', TODAY), null);
  });
  it('accepts today', () => {
    assert.equal(parseDob('26', '9', '2026', TODAY), '2026-09-26');
  });
});
