import { router } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { KioskApiError } from '../api/client';
import type { VisitView } from '../api/types';
import { useKioskApp } from '../store/useKioskApp';
import { useFlow } from './useFlow';
import { useRequestGuard } from './useRequestGuard';
import { useVisitPolling } from './useVisitPolling';

/** Paid: keep the final visit and move to the success screen (replace: Back never returns to a paid QR). */
export function goPaid(visit: VisitView): void {
  useFlow.getState().setVisit(visit);
  router.replace('/paid');
}

interface PayWaiting {
  /** The visit ended without payment (expired or cancelled): show the closed panel. */
  closed: VisitView | null;
  reconnecting: boolean;
  /** A Simulate button's request is running: it takes no second tap. */
  simulating: boolean;
  simulateFailed: boolean;
  simulate: () => void;
  /** Back to the method choice; takes one tap only (two would pop two screens). */
  chooseAnother: () => void;
}

/**
 * What the UPI and card screens share: polling, the closed state, the sample-mode simulate button
 * and "Choose another method". Every money action here is single-flight.
 */
export function usePayWaiting(visitId: string): PayWaiting {
  const api = useKioskApp((s) => s.api);
  const begin = useRequestGuard();
  const [closed, setClosed] = useState<VisitView | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [simulateFailed, setSimulateFailed] = useState(false);
  const inFlight = useRef(false);
  const leaving = useRef(false);

  const { reconnecting, report } = useVisitPolling(visitId, goPaid, (visit) => {
    useFlow.getState().setVisit(visit);
    setClosed(visit);
  });

  const simulate = useCallback(() => {
    if (!api || inFlight.current) return;
    inFlight.current = true;
    setSimulating(true);
    setSimulateFailed(false);
    const stale = begin();
    void (async () => {
      try {
        const visit = await api.sampleComplete(visitId);
        if (stale()) return;
        report(visit);
        // Paid or closed: the screen is moving on, so the button stays down.
        if (visit.status === 'awaiting-payment') setSimulating(false);
      } catch (err) {
        if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
        // If the payment went through anyway, the next poll finds it; otherwise the patient may try again.
        setSimulateFailed(true);
        setSimulating(false);
      } finally {
        inFlight.current = false;
      }
    })();
  }, [api, begin, report, visitId]);

  const chooseAnother = useCallback(() => {
    if (leaving.current) return;
    leaving.current = true;
    router.back();
  }, []);

  return { closed, reconnecting, simulating, simulateFailed, simulate, chooseAnother };
}
