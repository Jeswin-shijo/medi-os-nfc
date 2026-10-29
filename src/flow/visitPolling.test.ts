import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { classifyVisit, createPollTracker, methodSlug, RECONNECT_AFTER, secondsLeft, tokenWaitState, TOKEN_WAIT_MS } from './visitPolling';

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
