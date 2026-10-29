import { useCallback, useEffect, useRef } from 'react';
import { currentGeneration } from './useFlow';
import { makeStaleCheck } from './stale';

/**
 * `const stale = begin()` before a request; after `await`, `if (stale()) return` drops an answer
 * that arrives after the screen closed or the kiosk started over for the next patient.
 */
export function useRequestGuard(): () => () => boolean {
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return useCallback(() => makeStaleCheck(currentGeneration, () => mounted.current), []);
}
