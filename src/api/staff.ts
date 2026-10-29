// The staff menu's calls: sign in as a staff member, find a patient, link a card.
// No react-native imports: tested in plain Node.
import { KioskApiError, NETWORK_MESSAGE } from './client';

const TIMEOUT_MS = 12_000;

export interface StaffUser {
  name: string;
  role: string;
}

export interface StaffPatient {
  uhid: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
}

/** `code` on the error: 'CARD_LINKED_ELSEWHERE' (409; offer to move the card), 'UNAUTHORIZED' (401) or the client's codes. */
async function call<T>(
  apiUrl: string,
  path: string,
  init: { method: 'GET' | 'POST'; token?: string; body?: unknown },
  fetchImpl: typeof fetch,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  let payload: Record<string, unknown> | null = null;
  try {
    res = await fetchImpl(`${apiUrl.replace(/\/+$/, '')}${path}`, {
      method: init.method,
      headers: {
        'X-MediOS-Client': 'mobile',
        Accept: 'application/json',
        ...(init.token ? { Authorization: `Bearer ${init.token}` } : {}),
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: controller.signal,
    });
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      payload = null;
    }
  } catch {
    throw new KioskApiError(NETWORK_MESSAGE, 0, 'NETWORK');
  } finally {
    clearTimeout(timer);
  }
  if (res.ok) return (payload?.data ?? null) as T;
  const raw = payload?.message;
  const message = Array.isArray(raw) ? raw.join('. ') : typeof raw === 'string' && raw ? raw : `The hospital server answered with an error (${res.status}).`;
  const code = res.status === 409 ? 'CARD_LINKED_ELSEWHERE' : res.status === 401 ? 'UNAUTHORIZED' : res.status === 429 ? 'RATE_LIMITED' : 'HTTP';
  throw new KioskApiError(message, res.status, code);
}

/** Signs in with the staff member's own account. Only the access token and the user are kept; the refresh token in the answer is dropped. */
export async function staffLogin(
  apiUrl: string,
  email: string,
  password: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ accessToken: string; user: StaffUser }> {
  const data = await call<{ accessToken?: string; user?: { name?: string; role?: string } }>(
    apiUrl,
    '/auth/login',
    { method: 'POST', body: { email: email.trim(), password } },
    fetchImpl,
  );
  if (!data?.accessToken || !data.user) throw new KioskApiError('The sign-in answer was not understood.', 200, 'HTTP');
  return { accessToken: data.accessToken, user: { name: data.user.name ?? '', role: data.user.role ?? '' } };
}

/** Patients by name, UHID or phone. The API answers `{ patients, total }`; a plain list is accepted too. */
export async function searchPatients(apiUrl: string, token: string, q: string, fetchImpl: typeof fetch = fetch): Promise<StaffPatient[]> {
  const data = await call<{ patients?: StaffPatient[] } | StaffPatient[]>(
    apiUrl,
    `/patients?search=${encodeURIComponent(q.trim())}&limit=20`,
    { method: 'GET', token },
    fetchImpl,
  );
  const list = Array.isArray(data) ? data : (data?.patients ?? []);
  return list.map((p) => ({ uhid: p.uhid, name: p.name, age: p.age, gender: p.gender, phone: p.phone }));
}

/** Links a card to a patient. A card linked to someone else answers 409 (code CARD_LINKED_ELSEWHERE); repeat with `reassign` to move it. */
export async function linkCard(apiUrl: string, token: string, cardId: string, uhid: string, reassign?: boolean, fetchImpl: typeof fetch = fetch): Promise<void> {
  await call<unknown>(apiUrl, '/queue/cards', { method: 'POST', token, body: { cardId, uhid, ...(reassign ? { reassign: true } : {}) } }, fetchImpl);
}
