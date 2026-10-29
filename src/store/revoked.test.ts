import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shouldClearRevokedKey } from './revoked';

const OLD = { apiUrl: 'http://old.test/api', key: 'mqk_old' };
const NEW = { apiUrl: 'http://new.test/api', key: 'mqk_new' };

describe('shouldClearRevokedKey', () => {
  it('clears the stored key when the revoked client is the stored one', () => {
    assert.equal(shouldClearRevokedKey(OLD, { ...OLD }), true);
  });

  it('keeps a newer key when a late revocation arrives from the old server or old key', () => {
    assert.equal(shouldClearRevokedKey(NEW, OLD), false);
    assert.equal(shouldClearRevokedKey({ apiUrl: OLD.apiUrl, key: 'mqk_other' }, OLD), false);
  });

  it('has nothing to clear when nothing is stored', () => {
    assert.equal(shouldClearRevokedKey(null, OLD), false);
  });
});
