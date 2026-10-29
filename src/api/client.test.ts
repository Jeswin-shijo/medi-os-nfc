import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createKioskClient, KioskApiError } from './client';

const cfg = { apiUrl: 'http://hospital.test/api', key: 'mqk_abc' };

const reply = (status: number, body: unknown): typeof fetch =>
  (async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })) as typeof fetch;

const fail = async (promise: Promise<unknown>): Promise<KioskApiError> => {
  try {
    await promise;
  } catch (e) {
    assert.ok(e instanceof KioskApiError, 'expected a KioskApiError');
    return e;
  }
  throw new Error('expected the call to fail');
};

describe('api client', () => {
  it('unwraps data and sends the kiosk key', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ success: true, statusCode: 201, data: { id: 'v1' } }), { status: 201 });
    }) as unknown as typeof fetch;
    const client = createKioskClient(cfg, fetchImpl);
    assert.deepEqual(await client.post('/reception/kiosk/visits', { session: 's' }), { id: 'v1' });
    assert.equal(seen!.url, 'http://hospital.test/api/reception/kiosk/visits');
    assert.equal(seen!.init.method, 'POST');
    assert.equal((seen!.init.headers as Record<string, string>).Authorization, 'Kiosk mqk_abc');
    assert.equal(seen!.init.body, JSON.stringify({ session: 's' }));
  });

  it('api client maps 401 kiosk errors to KIOSK_REVOKED', async () => {
    const message = 'This kiosk link is no longer valid. Ask an administrator for a new one.';
    const client = createKioskClient(cfg, reply(401, { success: false, statusCode: 401, message }));
    const err = await fail(client.get('/reception/kiosk/config'));
    assert.equal(err.code, 'KIOSK_REVOKED');
    assert.equal(err.status, 401);
    const missing = createKioskClient(cfg, reply(401, { success: false, statusCode: 401, message: 'A kiosk key is required' }));
    assert.equal((await fail(missing.get('/x'))).code, 'KIOSK_REVOKED');
  });

  it('keeps other 401s as HTTP errors', async () => {
    const client = createKioskClient(cfg, reply(401, { success: false, statusCode: 401, message: 'Unauthorized' }));
    assert.equal((await fail(client.get('/x'))).code, 'HTTP');
  });

  it('api client surfaces backend code and data', async () => {
    const token = { label: 'G-024' };
    const client = createKioskClient(cfg, reply(409, { success: false, statusCode: 409, message: 'You already have a token', code: 'HAS_TOKEN', token }));
    const err = await fail(client.post('/reception/kiosk/visits'));
    assert.equal(err.code, 'HAS_TOKEN');
    assert.equal(err.status, 409);
    assert.equal(err.message, 'You already have a token');
    assert.equal((err.data!.token as { label: string }).label, 'G-024');
  });

  it('carries attemptsLeft and resendAfterSeconds', async () => {
    const wrong = createKioskClient(cfg, reply(400, { success: false, statusCode: 400, message: 'Not right', code: 'OTP_WRONG', attemptsLeft: 2 }));
    assert.equal((await fail(wrong.post('/x'))).data!.attemptsLeft, 2);
    const wait = createKioskClient(cfg, reply(429, { success: false, statusCode: 429, message: 'Wait', code: 'OTP_WAIT', resendAfterSeconds: 30 }));
    assert.equal((await fail(wait.post('/x'))).data!.resendAfterSeconds, 30);
  });

  it('joins validation message lists', async () => {
    const client = createKioskClient(cfg, reply(400, { success: false, statusCode: 400, message: ['a is bad', 'b is bad'] }));
    assert.equal((await fail(client.post('/x'))).message, 'a is bad. b is bad');
  });

  it('network failure becomes NETWORK', async () => {
    const client = createKioskClient(cfg, (async () => {
      throw new TypeError('Network request failed');
    }) as typeof fetch);
    const err = await fail(client.get('/x'));
    assert.equal(err.code, 'NETWORK');
    assert.equal(err.message, 'The kiosk cannot reach the hospital server.');
  });

  it('a request that never answers times out as NETWORK', async () => {
    const hang = ((_url: string, init: RequestInit) =>
      new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(new Error('aborted'))))) as unknown as typeof fetch;
    const client = createKioskClient(cfg, hang, 20);
    assert.equal((await fail(client.get('/x'))).code, 'NETWORK');
  });

  it('an answer that is not JSON becomes an HTTP error', async () => {
    const client = createKioskClient(cfg, (async () => new Response('<html>Bad gateway</html>', { status: 502 })) as typeof fetch);
    const err = await fail(client.get('/x'));
    assert.equal(err.code, 'HTTP');
    assert.equal(err.status, 502);
  });
});
