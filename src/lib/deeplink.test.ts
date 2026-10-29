import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeApiUrl, parseSetupLink } from './deeplink';

describe('parseSetupLink', () => {
  it('accepts the full link', () => {
    const url = 'medios-reception://setup?api=http%3A%2F%2F192.168.1.20%3A4000%2Fapi&key=mqk_abc123&printer=tcp%3A%2F%2F192.168.1.50%3A9100';
    assert.deepEqual(parseSetupLink(url), {
      apiUrl: 'http://192.168.1.20:4000/api',
      key: 'mqk_abc123',
      printer: { host: '192.168.1.50', port: 9100 },
    });
  });

  it('accepts a link without a printer, with an unencoded api', () => {
    assert.deepEqual(parseSetupLink('medios-reception://setup?api=https://api.hospital.test/api&key=mqk_x'), {
      apiUrl: 'https://api.hospital.test/api',
      key: 'mqk_x',
    });
  });

  it('rejects other schemes for the api', () => {
    assert.equal(parseSetupLink('medios-reception://setup?api=javascript:alert(1)&key=mqk_x'), null);
    assert.equal(parseSetupLink('medios-reception://setup?api=file:///etc/passwd&key=mqk_x'), null);
  });

  it('rejects a missing or wrong key', () => {
    assert.equal(parseSetupLink('medios-reception://setup?api=http://h.test/api'), null);
    assert.equal(parseSetupLink('medios-reception://setup?api=http://h.test/api&key=abc'), null);
  });

  it('rejects other links', () => {
    assert.equal(parseSetupLink('medios-reception://other?api=http://h.test/api&key=mqk_x'), null);
    assert.equal(parseSetupLink('https://evil.test/setup?api=http://h.test/api&key=mqk_x'), null);
    assert.equal(parseSetupLink('not a url'), null);
  });

  it('ignores a malformed printer instead of failing', () => {
    const link = parseSetupLink('medios-reception://setup?api=http://h.test/api&key=mqk_x&printer=tcp://host');
    assert.deepEqual(link, { apiUrl: 'http://h.test/api', key: 'mqk_x' });
  });
});

describe('normalizeApiUrl', () => {
  it('adds http and /api and drops a trailing slash', () => {
    assert.equal(normalizeApiUrl('192.168.1.20:4000'), 'http://192.168.1.20:4000/api');
    assert.equal(normalizeApiUrl(' https://api.h.test/ '), 'https://api.h.test/api');
    assert.equal(normalizeApiUrl('http://h.test/api/'), 'http://h.test/api');
  });

  it('refuses other schemes and blanks', () => {
    assert.equal(normalizeApiUrl('javascript:alert(1)'), null);
    assert.equal(normalizeApiUrl('   '), null);
  });
});
