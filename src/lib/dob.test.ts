import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseDob } from './dob';

// Local calendar day: 26 Sep 2026, just after midnight (the case where UTC is still the 25th in India).
const TODAY = new Date(2026, 8, 26, 0, 30);

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

  it('caps age at 120, like the backend', () => {
    assert.equal(parseDob('26', '9', '1906', TODAY), '1906-09-26'); // exactly 120 today
    assert.equal(parseDob('27', '9', '1905', TODAY), '1905-09-27'); // turns 121 tomorrow: still 120
    assert.equal(parseDob('26', '9', '1905', TODAY), null); // 121 today
    assert.equal(parseDob('1', '1', '1890', TODAY), null);
  });

  it('judges "future" by the local date, not UTC', () => {
    assert.equal(parseDob('26', '9', '2026', TODAY), '2026-09-26');
    assert.equal(parseDob('27', '9', '2026', TODAY), null);
  });
});
