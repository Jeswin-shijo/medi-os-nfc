import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canUseStaffMenu, STAFF_IDLE_MS, staffSecondsLeft, staffSessionExpired } from './session';

describe('staff session', () => {
  it('ends after 120 seconds without a touch', () => {
    assert.equal(STAFF_IDLE_MS, 120_000);
    assert.equal(staffSessionExpired(1000, 1000 + 119_999), false);
    assert.equal(staffSessionExpired(1000, 1000 + 120_000), true);
  });

  it('counts the seconds left', () => {
    assert.equal(staffSecondsLeft(0, 0), 120);
    assert.equal(staffSecondsLeft(0, 90_500), 30);
    assert.equal(staffSecondsLeft(0, 500_000), 0);
  });

  it('lets only admin, staff, nurse and doctor in', () => {
    for (const role of ['admin', 'staff', 'nurse', 'doctor']) assert.equal(canUseStaffMenu(role), true, role);
    for (const role of ['pharmacist', 'lab', '', undefined, null]) assert.equal(canUseStaffMenu(role), false, String(role));
  });
});
