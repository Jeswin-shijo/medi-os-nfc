// No react-native imports: tested in plain Node.
import { strings } from '../i18n/strings';

export type FlowStep = 0 | 1 | 2 | 3;

/** Identify → Doctor → Pay → Ticket, as the step tracker shows them. */
export const FLOW_STEPS: readonly string[] = strings.steps;

/** '/pay/upi/' and '/pay/upi' are the same route. */
export const normalizeRoute = (route: string): string => (route.length > 1 ? route.replace(/\/+$/, '') : route);

/** `route` itself or anything below it ('/find' matches '/find' and '/find/otp', not '/finder'). */
export const isUnder = (route: string, base: string): boolean => route === base || route.startsWith(`${base}/`);

/** Which step of the patient flow a route belongs to; null outside the flow (welcome, setup, staff). */
export function stepForRoute(route: string): FlowStep | null {
  const r = normalizeRoute(route);
  if (r === '/patient' || r === '/has-token' || r === '/register' || isUnder(r, '/find')) return 0;
  if (r === '/department' || r === '/doctor') return 1;
  if (r === '/payment' || r === '/paid' || r.startsWith('/pay/')) return 2;
  if (r === '/ticket') return 3;
  return null;
}
