import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideSetupLink, hostOfApiUrl } from './setupLinkPolicy';

describe('decideSetupLink', () => {
  it('applies the first setup link without sign-in', () => {
    assert.equal(decideSetupLink({ hasKey: false }), 'apply');
  });

  it('makes a kiosk that already has a key wait for a staff sign-in and confirmation', () => {
    assert.equal(decideSetupLink({ hasKey: true }), 'staff-confirm');
  });
});

describe('hostOfApiUrl', () => {
  it('shows only the host and port', () => {
    assert.equal(hostOfApiUrl('http://192.168.1.20:4000/api'), '192.168.1.20:4000');
    assert.equal(hostOfApiUrl('https://api.hospital.test/api'), 'api.hospital.test');
  });
});
