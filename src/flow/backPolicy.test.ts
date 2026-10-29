import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hardwareBackAction } from './backPolicy';

describe('hardwareBackAction', () => {
  it('does nothing on Welcome, setup and screens with no Back button', () => {
    for (const route of ['/', '/setup', '/paid', '/ticket', '/find/otp', '/pay/upi', '/staff', '/_dev/ui']) {
      assert.equal(hardwareBackAction(route), 'none', route);
    }
  });

  it('goes back where the screen has its own Back button', () => {
    for (const route of ['/department', '/doctor', '/payment', '/payment/', '/staff/printer']) {
      assert.equal(hardwareBackAction(route), 'back', route);
    }
  });
});
