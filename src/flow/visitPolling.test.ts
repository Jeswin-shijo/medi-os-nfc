import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyVisit, createPollTracker, methodSlug, orderReady, payScreenGuard, serverSkewMs, RECONNECT_AFTER, secondsLeft, tokenWaitState, TOKEN_WAIT_MS } from './visitPolling';

describe('classifyVisit', () => {
  it('maps the four statuses', () => {
    assert.equal(classifyVisit({ status: 'awaiting-payment' }), 'waiting');
    assert.equal(classifyVisit({ status: 'paid' }), 'paid');
    assert.equal(classifyVisit({ status: 'cancelled' }), 'closed');
    assert.equal(classifyVisit({ status: 'expired' }), 'closed');
  });
});

describe('createPollTracker', () => {
  it('keeps waiting until the visit is paid', () => {
    const t = createPollTracker();
    assert.equal(t.accept({ status: 'awaiting-payment' }), 'waiting');
    assert.equal(t.accept({ status: 'awaiting-payment' }), 'waiting');
    assert.equal(t.finished(), false);
  });
  it('reports paid exactly once, even when a poll and a simulate answer both say paid', () => {
    const t = createPollTracker();
    assert.equal(t.accept({ status: 'paid' }), 'paid');
    assert.equal(t.accept({ status: 'paid' }), 'done');
    assert.equal(t.accept({ status: 'paid' }), 'done');
    assert.equal(t.finished(), true);
  });
  it('reports a closed visit once, and nothing after paid', () => {
    const t = createPollTracker();
    assert.equal(t.accept({ status: 'expired' }), 'closed');
    assert.equal(t.accept({ status: 'cancelled' }), 'done');
    const u = createPollTracker();
    assert.equal(u.accept({ status: 'paid' }), 'paid');
    assert.equal(u.accept({ status: 'expired' }), 'done');
  });
  it('says reconnecting only after repeated failures, and a good answer clears it', () => {
    const t = createPollTracker();
    for (let i = 1; i < RECONNECT_AFTER; i++) assert.equal(t.failed(), false);
    assert.equal(t.failed(), true);
    assert.equal(t.failed(), true);
    t.accept({ status: 'awaiting-payment' });
    assert.equal(t.failed(), false);
  });
});

describe('secondsLeft', () => {
  const now = Date.parse('2026-09-26T10:00:00.000Z');
  it('counts whole seconds up, never below zero', () => {
    assert.equal(secondsLeft('2026-09-26T10:04:59.200Z', now, 300), 300);
    assert.equal(secondsLeft('2026-09-26T10:00:00.200Z', now, 300), 1);
    assert.equal(secondsLeft('2026-09-26T10:01:00.000Z', now, 300), 60);
    assert.equal(secondsLeft('2026-09-26T09:59:00.000Z', now, 300), 0);
  });
  it('never shows more than the longest wait the backend allows', () => {
    assert.equal(secondsLeft('2026-09-26T10:20:00.000Z', now, 300), 300);
  });
  it('treats an unreadable date as nothing left', () => {
    assert.equal(secondsLeft('soon', now, 300), 0);
  });
});

describe('tokenWaitState', () => {
  const t0 = 1_000_000;
  it('is ready as soon as there is a token', () => {
    assert.equal(tokenWaitState({ status: 'paid', token: { label: 'G-024' } }, t0, t0), 'ready');
    assert.equal(tokenWaitState({ status: 'paid', token: { label: 'G-024' } }, t0, t0 + 60_000), 'ready');
  });
  it('waits without a token, then gives up at the limit', () => {
    assert.equal(tokenWaitState({ status: 'paid' }, t0, t0 + TOKEN_WAIT_MS - 1), 'waiting');
    assert.equal(tokenWaitState({ status: 'paid' }, t0, t0 + TOKEN_WAIT_MS), 'gave-up');
  });
});

describe('methodSlug', () => {
  it('is the route segment', () => {
    assert.equal(methodSlug('UPI'), 'upi');
    assert.equal(methodSlug('CASH'), 'cash');
    assert.equal(methodSlug('CARD'), 'card');
  });
});

describe('payScreenGuard', () => {
  const upi = { method: 'UPI' as const, status: 'awaiting-payment' as const, upiUri: 'upi://pay' };
  it('sends no visit to Welcome', () => {
    assert.equal(payScreenGuard(undefined, 'UPI'), 'to-welcome');
  });
  it('sends a visit of another method back to the method choice', () => {
    assert.equal(payScreenGuard(upi, 'CARD'), 'to-payment');
    assert.equal(payScreenGuard({ status: 'awaiting-payment' }, 'UPI'), 'to-payment');
  });
  it('needs the order while awaiting payment', () => {
    assert.equal(payScreenGuard({ method: 'UPI', status: 'awaiting-payment' }, 'UPI'), 'to-payment');
    assert.equal(payScreenGuard({ method: 'CASH', status: 'awaiting-payment' }, 'CASH'), 'to-payment');
    assert.equal(payScreenGuard(upi, 'UPI'), 'stay');
    assert.equal(payScreenGuard({ method: 'CASH', status: 'awaiting-payment', paymentCode: '4821' }, 'CASH'), 'stay');
    assert.equal(payScreenGuard({ method: 'CARD', status: 'awaiting-payment' }, 'CARD'), 'stay');
  });
  it('stays on paid, cancelled and expired visits so the screen handles them', () => {
    for (const status of ['paid', 'cancelled', 'expired'] as const) {
      assert.equal(payScreenGuard({ method: 'UPI', status }, 'UPI'), 'stay');
      assert.equal(payScreenGuard({ method: 'CASH', status }, 'CASH'), 'stay');
    }
  });
});

describe('serverSkewMs', () => {
  it('is how far the server clock is ahead of the tablet', () => {
    const device = Date.parse('2026-09-26T10:00:00.000Z');
    assert.equal(serverSkewMs('2026-09-26T10:00:30.000Z', device), 30_000);
    assert.equal(serverSkewMs('2026-09-26T09:59:00.000Z', device), -60_000);
    assert.equal(serverSkewMs('garbage', device), 0);
  });
  it('corrects a countdown on a tablet that runs behind', () => {
    const device = Date.parse('2026-09-26T10:00:00.000Z');
    const skew = serverSkewMs('2026-09-26T10:01:00.000Z', device); // tablet is a minute slow
    // 5 min order, expires 10:06 server time; server now is 10:01 -> 300 s, not 360.
    assert.equal(secondsLeft('2026-09-26T10:06:00.000Z', device + skew, 300), 300);
    assert.equal(secondsLeft('2026-09-26T10:04:00.000Z', device + skew, 300), 180);
  });
});

describe('orderReady', () => {
  const waiting = { status: 'awaiting-payment' as const };
  it('needs the QR link for UPI and the counter code for cash', () => {
    assert.equal(orderReady({ ...waiting, upiUri: 'upi://pay' }, 'UPI'), true);
    assert.equal(orderReady(waiting, 'UPI'), false);
    assert.equal(orderReady({ ...waiting, paymentCode: '4821' }, 'CASH'), true);
    assert.equal(orderReady(waiting, 'CASH'), false);
  });
  it('needs nothing more for a card: the card machine shows the amount', () => {
    assert.equal(orderReady(waiting, 'CARD'), true);
  });
  it('is never ready once the visit is not waiting for payment', () => {
    assert.equal(orderReady({ status: 'paid', upiUri: 'upi://pay' }, 'UPI'), false);
    assert.equal(orderReady({ status: 'expired' }, 'CARD'), false);
  });
});
