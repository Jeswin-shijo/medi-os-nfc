// No react-native or expo imports here: the tests run in plain Node.

export const NETWORK_MESSAGE = 'The kiosk cannot reach the hospital server.';
const TIMEOUT_MS = 12_000;

/** `code` is the backend's, or 'NETWORK' | 'KIOSK_REVOKED' | 'HTTP'. `data` holds other fields of the error answer (token, attemptsLeft, resendAfterSeconds). */
export class KioskApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'KioskApiError';
  }
}

export interface KioskClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
}

const ENVELOPE_KEYS = new Set(['success', 'statusCode', 'message', 'code']);
const REVOKED = /kiosk (key|link)/i;

export function createKioskClient(cfg: { apiUrl: string; key: string }, fetchImpl: typeof fetch = fetch, timeoutMs = TIMEOUT_MS): KioskClient {
  const base = cfg.apiUrl.replace(/\/+$/, '');

  async function request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    let payload: Record<string, unknown> | null = null;
    try {
      res = await fetchImpl(`${base}${path}`, {
        method,
        headers: {
          Authorization: `Kiosk ${cfg.key}`,
          Accept: 'application/json',
          ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
      // Read inside the timeout: a stalled body is a network problem too.
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
    if (res.status === 401 && REVOKED.test(message)) throw new KioskApiError(message, 401, 'KIOSK_REVOKED');
    const code = typeof payload?.code === 'string' ? payload.code : 'HTTP';
    const extra = Object.fromEntries(Object.entries(payload ?? {}).filter(([key]) => !ENVELOPE_KEYS.has(key)));
    throw new KioskApiError(message, res.status, code, Object.keys(extra).length ? extra : undefined);
  }

  return {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body),
  };
}
