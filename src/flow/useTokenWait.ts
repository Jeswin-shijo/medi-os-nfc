import { useEffect, useRef, useState } from 'react';
import { KioskApiError } from '../api/client';
import { useKioskApp } from '../store/useKioskApp';
import { useFlow } from './useFlow';
import { useRequestGuard } from './useRequestGuard';
import { POLL_MS, TOKEN_WAIT_MS, tokenWaitState, type TokenWait } from './visitPolling';

/**
 * For a visit that is paid: is its token there? Rarely the backend needs a few seconds after the
 * payment. While it is missing, ask again every 2 s for up to 10 s (storing what comes back in the
 * flow), then `gave-up`: the screen sends the patient to the desk. Only reads; never pays again.
 */
export function useTokenWait(): TokenWait {
  const api = useKioskApp((s) => s.api);
  const visit = useFlow((s) => s.visit);
  const begin = useRequestGuard();
  const hasToken = !!visit?.token;
  const id = visit?.id;
  const [gaveUp, setGaveUp] = useState(false);
  const started = useRef(0);

  useEffect(() => {
    if (!api || !id || hasToken) return;
    const stale = begin();
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    started.current = Date.now();

    const giveUp = setTimeout(() => {
      if (!stopped && !stale()) setGaveUp(true);
    }, TOKEN_WAIT_MS);

    const run = async () => {
      if (stopped || stale()) return;
      try {
        const fresh = await api.visit(id);
        if (stopped || stale()) return;
        if (fresh.status === 'paid' && fresh.token) {
          useFlow.getState().setVisit(fresh);
          return;
        }
      } catch (err) {
        if (stopped || stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      }
      if (!stopped && !stale() && tokenWaitState({ status: 'paid' }, started.current, Date.now()) === 'waiting') {
        timer = setTimeout(() => void run(), POLL_MS);
      }
    };
    timer = setTimeout(() => void run(), POLL_MS);

    return () => {
      stopped = true;
      clearTimeout(timer);
      clearTimeout(giveUp);
    };
  }, [api, id, hasToken, begin]);

  if (hasToken) return 'ready';
  return gaveUp ? 'gave-up' : 'waiting';
}
