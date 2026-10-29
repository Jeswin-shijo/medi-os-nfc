import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KioskApiError, NETWORK_MESSAGE } from '../api/client';
import { loadFailureUpdate } from './loadFailure';

const STORED = { apiUrl: 'http://h.test/api', key: 'mqk_x' };

describe('loadFailureUpdate', () => {
  it('keeps the stored server address when the server cannot be reached, so staff sign-in still has it', () => {
    const net = new KioskApiError(NETWORK_MESSAGE, 0, 'NETWORK');
    assert.deepEqual(loadFailureUpdate(STORED, net, 'loading'), { status: 'offline', loadError: NETWORK_MESSAGE, address: STORED.apiUrl });
  });

  it('keeps it for other failures too', () => {
    assert.deepEqual(loadFailureUpdate(STORED, new Error('boom'), 'loading'), { status: 'offline', loadError: 'boom', address: STORED.apiUrl });
  });

  it('changes nothing when a revoked key already moved the kiosk to setup', () => {
    assert.equal(loadFailureUpdate(STORED, new KioskApiError('Kiosk key revoked', 401, 'KIOSK_REVOKED'), 'unconfigured'), null);
  });
});
