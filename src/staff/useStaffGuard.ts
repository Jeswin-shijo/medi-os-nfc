import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { staffSecondsLeft, staffSessionExpired } from './session';
import { useStaffSession } from './useStaffSession';

/** Signs out and goes back to the patient screen. */
export function leaveStaffMode(): void {
  useStaffSession.getState().end();
  router.dismissTo('/');
}

/**
 * Keeps a staff screen honest: starts the 120 s clock, signs out and leaves when it runs out,
 * and (when `requireSession`) sends anyone who is not signed in to the sign-in screen.
 * Returns the seconds left.
 */
export function useStaffGuard(requireSession: boolean): number {
  const token = useStaffSession((s) => s.token);
  const [seconds, setSeconds] = useState(() => staffSecondsLeft(useStaffSession.getState().lastActive, Date.now()));
  const leaving = useRef(false);

  useEffect(() => {
    useStaffSession.getState().touch();
    leaving.current = false;
    const timer = setInterval(() => {
      const { lastActive } = useStaffSession.getState();
      const now = Date.now();
      setSeconds(staffSecondsLeft(lastActive, now));
      if (!leaving.current && staffSessionExpired(lastActive, now)) {
        leaving.current = true;
        leaveStaffMode();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (requireSession && !token && !leaving.current) router.replace('/staff');
  }, [requireSession, token]);

  return seconds;
}
