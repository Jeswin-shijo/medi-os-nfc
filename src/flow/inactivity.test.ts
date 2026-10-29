import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { idleLimitSeconds, WARNING_SECONDS } from './inactivity';

const cfg = { idleSeconds: 60 };

describe('idleLimitSeconds', () => {
  it('never times out on the welcome screen', () => {
    assert.equal(idleLimitSeconds('/', cfg), null);
  });

  it('never times out on the setup screen', () => {
    assert.equal(idleLimitSeconds('/setup', cfg), null);
  });

  it('never times out in the staff menu (it has its own sign-out)', () => {
    assert.equal(idleLimitSeconds('/staff', cfg), null);
    assert.equal(idleLimitSeconds('/staff/link-card', cfg), null);
    assert.equal(idleLimitSeconds('/staff/printer', cfg), null);
  });

  it('never times out in the developer gallery', () => {
    assert.equal(idleLimitSeconds('/_dev/ui', cfg), null);
  });

  it('gives 5 minutes on the UPI and card waiting screens', () => {
    assert.equal(idleLimitSeconds('/pay/upi', cfg), 300);
    assert.equal(idleLimitSeconds('/pay/card', cfg), 300);
  });

  it('gives 3 minutes on the cash screen', () => {
    assert.equal(idleLimitSeconds('/pay/cash', cfg), 180);
  });

  it('gives 30 seconds on the ticket screen', () => {
    assert.equal(idleLimitSeconds('/ticket', cfg), 30);
  });

  it("uses the kiosk's own limit on every other step", () => {
    for (const route of ['/patient', '/has-token', '/find', '/find/otp', '/find/choose', '/register', '/department', '/doctor', '/payment', '/paid']) {
      assert.equal(idleLimitSeconds(route, { idleSeconds: 75 }), 75, route);
    }
  });

  it('does not mistake look-alike routes for the special ones', () => {
    assert.equal(idleLimitSeconds('/staffing', cfg), 60);
    assert.equal(idleLimitSeconds('/pay/upi-help', cfg), 60);
    assert.equal(idleLimitSeconds('/tickets', cfg), 60);
  });

  it('ignores a trailing slash', () => {
    assert.equal(idleLimitSeconds('/pay/upi/', cfg), 300);
    assert.equal(idleLimitSeconds('/staff/', cfg), null);
  });
});

describe('WARNING_SECONDS', () => {
  it('gives the patient 10 seconds to answer "Are you still there?"', () => {
    assert.equal(WARNING_SECONDS, 10);
  });
});
