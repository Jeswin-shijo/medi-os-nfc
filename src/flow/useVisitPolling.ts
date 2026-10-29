import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { KioskApiError } from '../api/client';
import type { VisitView } from '../api/types';
import { useKioskApp } from '../store/useKioskApp';
import { useRequestGuard } from './useRequestGuard';
import { createPollTracker, POLL_MS } from './visitPolling';

interface VisitPolling {
  /** Several answers in a row failed: show a small "Reconnecting…" note. */
  reconnecting: boolean;
  /**
   * Hand over an answer that came from somewhere else (the Simulate button). It goes through the
   * same once-only check as polled answers, so the screen never moves on twice.
   */
  report: (visit: VisitView) => void;
}

/**
 * Asks the server about a visit every 2 s while the screen is in front: `paid` → `onPaid`,
 * `cancelled` or `expired` → `onClosed`, each at most once. Network errors keep it asking.
 * It stops when the screen goes away or the kiosk starts over for the next patient.
 */
export function useVisitPolling(visitId: string, onPaid: (visit: VisitView) => void, onClosed: (visit: VisitView) => void): VisitPolling {
  const api = useKioskApp((s) => s.api);
  const begin = useRequestGuard();
  // A new visit starts a new tracker (the dependency is the point, not a value used inside).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tracker = useMemo(() => createPollTracker(), [visitId]);
  const [reconnecting, setReconnecting] = useState(false);
  const handlers = useRef({ onPaid, onClosed });
  useEffect(() => {
    handlers.current = { onPaid, onClosed };
  });

  const apply = useCallback(
    (visit: VisitView) => {
      const action = tracker.accept(visit);
      setReconnecting(false);
      if (action === 'paid') handlers.current.onPaid(visit);
      else if (action === 'closed') handlers.current.onClosed(visit);
    },
    [tracker],
  );

  useFocusEffect(
    useCallback(() => {
      if (!api) return;
      const stale = begin();
      let stopped = false;
      let timer: ReturnType<typeof setTimeout> | undefined;

      // One request at a time: the next one is scheduled only after this one has answered.
      const run = async () => {
        if (stopped || stale() || tracker.finished()) return;
        try {
          const visit = await api.visit(visitId);
          if (stopped || stale()) return;
          apply(visit);
        } catch (err) {
          if (stopped || stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
          setReconnecting(tracker.failed());
        }
        if (!stopped && !stale() && !tracker.finished()) timer = setTimeout(() => void run(), POLL_MS);
      };
      void run();

      return () => {
        stopped = true;
        clearTimeout(timer);
      };
    }, [api, begin, tracker, visitId, apply]),
  );

  const report = useCallback((visit: VisitView) => apply(visit), [apply]);
  return { reconnecting, report };
}
