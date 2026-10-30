import { router, usePathname } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { isUnder } from '../flow/steps';
import { useKioskApp } from '../store/useKioskApp';
import { staffSecondsLeft, staffSessionExpired } from './session';
import { useStaffSession } from './useStaffSession';

/**
 * True from Exit staff mode until someone signs in again: the screens still on the way out lose their
 * session as they go, and must not send the kiosk to staff sign-in (it stayed there for the rest of the
 * two minutes when staff left from Kiosk setup). Not cleared when a staff screen
 * opens: the menu turns into the sign-in form (a new frame) during the exit itself.
 */
let exiting = false;

/** Signs out and goes back to the patient screen. */
export function leaveStaffMode(): void {
  exiting = true;
  useStaffSession.getState().end();
  // A kiosk whose key was removed has no patient screens: back to its "removed" screen.
  router.dismissTo(useKioskApp.getState().status === 'unconfigured' ? '/setup' : '/');
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
    // A session that ran out while no staff screen was open is over: opening a screen never revives it.
    const { lastActive, token: held, end } = useStaffSession.getState();
    if (held && staffSessionExpired(lastActive, Date.now())) end();
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
    if (token) exiting = false;
    else if (requireSession && !leaving.current && !exiting) router.replace('/staff');
  }, [requireSession, token]);

  return seconds;
}

/**
 * Whoever is signed in is signed out the moment the app leaves the staff screens. A setup link
 * waiting for confirmation survives only the hop through /setup (that is how it gets to staff
 * sign-in); anywhere else it is dropped, so a stale link never resurfaces hours later.
 */
export function useEndStaffOutsideStaff(): void {
  const pathname = usePathname();
  useEffect(() => {
    if (isUnder(pathname, '/staff')) return;
    if (pathname === '/setup') useStaffSession.getState().signOut();
    else useStaffSession.getState().end();
  }, [pathname]);
}
