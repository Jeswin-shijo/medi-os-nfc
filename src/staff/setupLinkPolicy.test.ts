import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideSetupScreen, hostOfApiUrl } from './setupLinkPolicy';

const LINK = { apiUrl: 'http://h.test/api', key: 'mqk_x' };

describe('decideSetupScreen', () => {
  it('applies the first setup link of a kiosk without a key', () => {
    assert.equal(decideSetupScreen({ hasKey: false, link: LINK }), 'apply');
  });

  it('shows the open form to a kiosk without a key when there is no (valid) link', () => {
    assert.equal(decideSetupScreen({ hasKey: false, link: null }), 'manual-form');
  });

  it('makes a kiosk that has a key wait for staff to confirm a valid link', () => {
    assert.equal(decideSetupScreen({ hasKey: true, link: LINK }), 'confirm-with-staff');
  });

  it('sends a kiosk that has a key to staff sign-in when there is no valid link: never the open form', () => {
    assert.equal(decideSetupScreen({ hasKey: true, link: null }), 'staff');
  });
});

describe('hostOfApiUrl', () => {
  it('shows only the host and port', () => {
    assert.equal(hostOfApiUrl('http://192.168.1.20:4000/api'), '192.168.1.20:4000');
    assert.equal(hostOfApiUrl('https://api.hospital.test/api'), 'api.hospital.test');
  });
});
