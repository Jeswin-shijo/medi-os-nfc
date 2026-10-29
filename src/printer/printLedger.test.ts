import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { PrintLedger } from './printLedger';

describe('PrintLedger', () => {
  it('lets the automatic print happen once per slip, however often the screen mounts', () => {
    const ledger = new PrintLedger(3);
    assert.equal(ledger.claimFirst('visit-1'), true);
    ledger.finish('visit-1', true);
    // A re-mount, or React running the effect twice.
    assert.equal(ledger.claimFirst('visit-1'), false);
    assert.equal(ledger.claimFirst('visit-1'), false);
    assert.equal(ledger.get('visit-1').used, 1);
  });

  it('claims at once, so an effect run twice in a row cannot start two prints', () => {
    const ledger = new PrintLedger(3);
    assert.equal(ledger.claimFirst('visit-1'), true);
    assert.equal(ledger.claimFirst('visit-1'), false);
    assert.deepEqual(ledger.get('visit-1'), { used: 1, state: 'printing' });
  });

  it('allows two more prints after the first, then no more', () => {
    const ledger = new PrintLedger(3);
    ledger.claimFirst('visit-1');
    ledger.finish('visit-1', false);
    assert.equal(ledger.claim('visit-1'), true);
    ledger.finish('visit-1', true);
    assert.equal(ledger.claim('visit-1'), true);
    ledger.finish('visit-1', true);
    assert.equal(ledger.claim('visit-1'), false);
    assert.deepEqual(ledger.get('visit-1'), { used: 3, state: 'printed' });
  });

  it('never starts a print while one is still printing', () => {
    const ledger = new PrintLedger(3);
    ledger.claimFirst('visit-1');
    assert.equal(ledger.claim('visit-1'), false);
    ledger.finish('visit-1', true);
    assert.equal(ledger.claim('visit-1'), true);
  });

  it('records how the last print ended', () => {
    const ledger = new PrintLedger(3);
    assert.deepEqual(ledger.get('visit-1'), { used: 0, state: 'idle' });
    ledger.claimFirst('visit-1');
    ledger.finish('visit-1', false);
    assert.equal(ledger.get('visit-1').state, 'failed');
  });

  it('never lets the automatic print go after a manual one', () => {
    const ledger = new PrintLedger(3);
    assert.equal(ledger.claim('token-1'), true);
    ledger.finish('token-1', true);
    assert.equal(ledger.claimFirst('token-1'), false);
  });

  it('counts each slip on its own', () => {
    const ledger = new PrintLedger(3);
    ledger.claimFirst('visit-1');
    assert.equal(ledger.claimFirst('visit-2'), true);
    assert.equal(ledger.get('visit-3').used, 0);
  });

  it('keeps the same snapshot until something changes (for useSyncExternalStore)', () => {
    const ledger = new PrintLedger(3);
    assert.equal(ledger.get('a'), ledger.get('b'));
    ledger.claimFirst('a');
    const printing = ledger.get('a');
    assert.equal(ledger.get('a'), printing);
    ledger.finish('a', true);
    assert.notEqual(ledger.get('a'), printing);
  });

  it('tells subscribers about every change', () => {
    const ledger = new PrintLedger(3);
    let calls = 0;
    const unsubscribe = ledger.subscribe(() => calls++);
    ledger.claimFirst('a');
    ledger.finish('a', true);
    assert.equal(ledger.claim('a'), true);
    assert.equal(calls, 3);
    unsubscribe();
    ledger.finish('a', true);
    assert.equal(calls, 3);
  });

  it('ignores the end of a print it never started', () => {
    const ledger = new PrintLedger(3);
    ledger.finish('ghost', true);
    assert.deepEqual(ledger.get('ghost'), { used: 0, state: 'idle' });
  });

  it('forgets the oldest slips beyond its memory', () => {
    const ledger = new PrintLedger(3, 2);
    ledger.claimFirst('a');
    ledger.claimFirst('b');
    ledger.claimFirst('c');
    assert.equal(ledger.get('a').used, 0);
    assert.equal(ledger.get('b').used, 1);
    assert.equal(ledger.get('c').used, 1);
  });
});
