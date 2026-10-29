import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { staffSessionExpired } from './session';
import { useStaffSession } from './useStaffSession';

const LINK = { apiUrl: 'http://h.test/api', key: 'mqk_x' };

describe('staff session store', () => {
  it('signOut forgets the person but keeps a setup link waiting for confirmation; end drops both', () => {
    const s = useStaffSession.getState();
    s.signIn('AT', { name: 'Nina', role: 'nurse' });
    s.holdSetupLink(LINK);
    useStaffSession.getState().signOut();
    assert.equal(useStaffSession.getState().token, null);
    assert.deepEqual(useStaffSession.getState().pendingLink, LINK);
    useStaffSession.getState().end();
    assert.equal(useStaffSession.getState().pendingLink, null);
  });

  it('a session untouched for 120 s is expired when a staff screen opens again (it is ended before the clock restarts)', () => {
    useStaffSession.getState().signIn('AT', { name: 'Nina', role: 'nurse' });
    const { lastActive } = useStaffSession.getState();
    assert.equal(staffSessionExpired(lastActive, lastActive + 121_000), true);
    assert.equal(staffSessionExpired(lastActive, lastActive + 5_000), false);
  });
});
