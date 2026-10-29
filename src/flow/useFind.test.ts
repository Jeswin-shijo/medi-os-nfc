import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { useFind } from './useFind';

describe('useFind privacy', () => {
  beforeEach(() => useFind.getState().clear());

  it('forgets everything when a screen is entered fresh', () => {
    useFind.getState().setPhone('9876543210');
    useFind.getState().setCode({ sampleCode: '123456', resendAfterSeconds: 30 });
    useFind.getState().setNotice('expired');
    useFind.getState().enter();
    const s = useFind.getState();
    assert.deepEqual([s.phone, s.sampleCode, s.notice, s.candidates], ['', undefined, null, []]);
  });

  it('keeps a handed-over number for exactly one entry', () => {
    useFind.getState().handOff('9876543210');
    useFind.getState().enter();
    assert.equal(useFind.getState().phone, '9876543210');
    useFind.getState().enter();
    assert.equal(useFind.getState().phone, '');
  });

  it('clear drops the number, code, notice and family list', () => {
    useFind.getState().setPhone('9876543210');
    useFind.getState().setCandidates([{} as never]);
    useFind.getState().clear();
    assert.equal(useFind.getState().phone, '');
    assert.equal(useFind.getState().candidates.length, 0);
  });
});
