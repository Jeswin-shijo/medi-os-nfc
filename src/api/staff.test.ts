import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { KioskApiError } from './client';
import { linkCard, searchPatients, staffLogin } from './staff';

type Call = { url: string; init: RequestInit };
function fake(status: number, body: unknown, calls: Call[] = []): typeof fetch {
  return (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok: status >= 200 && status < 300, status, json: async () => body } as Response;
  }) as unknown as typeof fetch;
}

describe('staffLogin', () => {
  it('posts the credentials as a mobile client and keeps only the token and user', async () => {
    const calls: Call[] = [];
    const result = await staffLogin(
      'http://h.test/api/',
      ' nurse@x.test ',
      'pw',
      fake(200, { data: { accessToken: 'AT', refreshToken: 'RT', user: { name: 'Nina', role: 'nurse', email: 'n@x' } } }, calls),
    );
    assert.deepEqual(result, { accessToken: 'AT', user: { name: 'Nina', role: 'nurse' } });
    assert.equal(calls[0].url, 'http://h.test/api/auth/login');
    assert.equal((calls[0].init.headers as Record<string, string>)['X-MediOS-Client'], 'mobile');
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { email: 'nurse@x.test', password: 'pw' });
  });

  it('shows the server message on a wrong password and on a lock-out', async () => {
    await assert.rejects(staffLogin('http://h/api', 'a', 'b', fake(401, { message: 'Invalid credentials' })), (e: KioskApiError) => e.code === 'UNAUTHORIZED' && e.message === 'Invalid credentials');
    await assert.rejects(staffLogin('http://h/api', 'a', 'b', fake(429, { message: 'Account locked' })), (e: KioskApiError) => e.code === 'RATE_LIMITED');
  });

  it('maps a dead network to NETWORK', async () => {
    const down = (async () => {
      throw new Error('offline');
    }) as unknown as typeof fetch;
    await assert.rejects(staffLogin('http://h/api', 'a', 'b', down), (e: KioskApiError) => e.code === 'NETWORK');
  });
});

describe('searchPatients', () => {
  it('sends the bearer token and unwraps the patients', async () => {
    const calls: Call[] = [];
    const list = await searchPatients(
      'http://h/api',
      'AT',
      'rekha s',
      fake(200, { data: { patients: [{ uhid: 'MHK1', name: 'Rekha S', age: 34, gender: 'Female', phone: '9876543210', extra: 1 }], total: 1 } }, calls),
    );
    assert.deepEqual(list, [{ uhid: 'MHK1', name: 'Rekha S', age: 34, gender: 'Female', phone: '9876543210' }]);
    assert.equal(calls[0].url, 'http://h/api/patients?search=rekha%20s&limit=20');
    assert.equal((calls[0].init.headers as Record<string, string>).Authorization, 'Bearer AT');
  });
});

describe('linkCard', () => {
  it('posts the card, and reassign only when asked', async () => {
    const calls: Call[] = [];
    await linkCard('http://h/api', 'AT', '04A1B2C3', 'MHK1', undefined, fake(201, { data: {} }, calls));
    await linkCard('http://h/api', 'AT', '04A1B2C3', 'MHK1', true, fake(201, { data: {} }, calls));
    assert.deepEqual(JSON.parse(String(calls[0].init.body)), { cardId: '04A1B2C3', uhid: 'MHK1' });
    assert.deepEqual(JSON.parse(String(calls[1].init.body)), { cardId: '04A1B2C3', uhid: 'MHK1', reassign: true });
  });

  it('reports a card linked elsewhere as CARD_LINKED_ELSEWHERE with the server text', async () => {
    const msg = 'Card …B2C3 is already linked to Asha K (MHK2).';
    await assert.rejects(linkCard('http://h/api', 'AT', 'X', 'MHK1', false, fake(409, { message: msg })), (e: KioskApiError) => e.code === 'CARD_LINKED_ELSEWHERE' && e.message === msg);
  });
});
