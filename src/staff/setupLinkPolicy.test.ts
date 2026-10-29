import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decideSetupScreen, hostOfApiUrl } from './setupLinkPolicy';

const LINK = { apiUrl: 'http://h.test/api', key: 'mqk_x' };

describe('decideSetupScreen', () => {
  it('a fresh install (nothing stored) applies a valid link, else shows the open form', () => {
    assert.equal(decideSetupScreen({ hasKey: false, hadServer: false, link: LINK }), 'apply');
    assert.equal(decideSetupScreen({ hasKey: false, hadServer: false, link: null }), 'manual-form');
  });

  it('a kiosk whose key was removed (server still stored) never shows the open form', () => {
    assert.equal(decideSetupScreen({ hasKey: false, hadServer: true, link: null }), 'removed');
    assert.equal(decideSetupScreen({ hasKey: false, hadServer: true, link: LINK }), 'confirm-with-staff');
  });

  it('a kiosk that has a key waits for staff to confirm a valid link, and sends anything else to staff sign-in', () => {
    assert.equal(decideSetupScreen({ hasKey: true, hadServer: true, link: LINK }), 'confirm-with-staff');
    assert.equal(decideSetupScreen({ hasKey: true, hadServer: true, link: null }), 'staff');
  });
});

describe('hostOfApiUrl', () => {
  it('shows only the host and port', () => {
    assert.equal(hostOfApiUrl('http://192.168.1.20:4000/api'), '192.168.1.20:4000');
    assert.equal(hostOfApiUrl('https://api.hospital.test/api'), 'api.hospital.test');
  });
});
