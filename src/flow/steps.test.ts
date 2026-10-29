import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FLOW_STEPS, stepForRoute } from './steps';

describe('stepForRoute', () => {
  it('puts the ways of identifying the patient in step 0 (Identify)', () => {
    for (const route of ['/patient', '/has-token', '/find', '/find/otp', '/find/choose', '/register']) {
      assert.equal(stepForRoute(route), 0, route);
    }
  });

  it('puts department and doctor in step 1 (Doctor)', () => {
    assert.equal(stepForRoute('/department'), 1);
    assert.equal(stepForRoute('/doctor'), 1);
  });

  it('puts choosing, paying and the payment receipt in step 2 (Pay)', () => {
    for (const route of ['/payment', '/pay/upi', '/pay/cash', '/pay/card', '/paid']) {
      assert.equal(stepForRoute(route), 2, route);
    }
  });

  it('puts the OP ticket in step 3 (Ticket)', () => {
    assert.equal(stepForRoute('/ticket'), 3);
  });

  it('has no step outside the patient flow', () => {
    for (const route of ['/', '/setup', '/staff', '/staff/printer', '/_dev/ui', '/unknown']) {
      assert.equal(stepForRoute(route), null, route);
    }
  });

  it('does not match look-alike routes', () => {
    for (const route of ['/finder', '/payments', '/pay', '/tickets', '/doctors', '/registered']) {
      assert.equal(stepForRoute(route), null, route);
    }
  });

  it('ignores a trailing slash', () => {
    assert.equal(stepForRoute('/find/'), 0);
    assert.equal(stepForRoute('/pay/upi/'), 2);
  });
});

describe('FLOW_STEPS', () => {
  it('names the four steps in order', () => {
    assert.deepEqual(FLOW_STEPS, ['Identify', 'Doctor', 'Pay', 'Ticket']);
  });
});
