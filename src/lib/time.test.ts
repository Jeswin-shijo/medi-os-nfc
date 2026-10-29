import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { clinicClock, formatHeaderTime } from './time';

const IST = 330;

describe('formatHeaderTime', () => {
  it('formats 10:24 AM on a Saturday', () => {
    // 04:54 UTC is 10:24 in India.
    const d = new Date(Date.UTC(2026, 8, 26, 4, 54));
    assert.equal(formatHeaderTime(d, IST), 'Sat, 26 Sep 2026  10:24 AM');
  });

  it('formats 12:05 AM, the first hour of the day', () => {
    const d = new Date(Date.UTC(2026, 8, 25, 18, 35));
    assert.equal(formatHeaderTime(d, IST), 'Sat, 26 Sep 2026  12:05 AM');
  });

  it('formats 12:30 PM and 11:59 PM', () => {
    assert.equal(formatHeaderTime(new Date(Date.UTC(2026, 8, 26, 7, 0)), IST), 'Sat, 26 Sep 2026  12:30 PM');
    assert.equal(formatHeaderTime(new Date(Date.UTC(2026, 8, 26, 18, 29)), IST), 'Sat, 26 Sep 2026  11:59 PM');
  });
});

describe('clinicClock', () => {
  const clinic = { date: '2026-09-26', utcOffsetMinutes: IST, serverTime: '2026-10-29T04:54:00.000Z' };

  it('pins the clinic date and keeps the time of day', () => {
    mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-29T04:54:00.000Z') });
    try {
      const clock = clinicClock(clinic, Date.now());
      assert.equal(formatHeaderTime(clock(), IST), 'Sat, 26 Sep 2026  10:24 AM');
      mock.timers.tick(60_000);
      assert.equal(formatHeaderTime(clock(), IST), 'Sat, 26 Sep 2026  10:25 AM');
    } finally {
      mock.timers.reset();
    }
  });

  it('applies the server clock skew', () => {
    // The tablet is 10 minutes slow: the server says 04:54, the tablet 04:44.
    mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-29T04:44:00.000Z') });
    try {
      const clock = clinicClock(clinic, Date.now());
      assert.equal(formatHeaderTime(clock(), IST), 'Sat, 26 Sep 2026  10:24 AM');
    } finally {
      mock.timers.reset();
    }
  });

  it('keeps the pinned day when the pinned date is on the other side of midnight', () => {
    mock.timers.enable({ apis: ['Date'], now: Date.parse('2026-10-29T18:35:00.000Z') });
    try {
      // 00:05 on 30 Oct in India, pinned to 26 Sep.
      const clock = clinicClock({ ...clinic, serverTime: '2026-10-29T18:35:00.000Z' }, Date.now());
      assert.equal(formatHeaderTime(clock(), IST), 'Sat, 26 Sep 2026  12:05 AM');
    } finally {
      mock.timers.reset();
    }
  });
});
