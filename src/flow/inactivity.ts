// No react-native imports: tested in plain Node.
import { isUnder, normalizeRoute } from './steps';

/** How long "Are you still there?" waits for a touch before the kiosk starts over. */
export const WARNING_SECONDS = 10;

/**
 * Seconds without a touch before "Are you still there?" appears, or null where the kiosk never
 * times out: the welcome screen (nothing to reset), setup, the staff menu (it signs out on its own)
 * and the developer gallery.
 */
export function idleLimitSeconds(route: string, cfg: { idleSeconds: number }): number | null {
  const r = normalizeRoute(route);
  if (r === '/' || r === '/setup' || isUnder(r, '/staff') || isUnder(r, '/_dev')) return null;
  // Paying takes a while (finding the phone, walking to the counter).
  if (r === '/pay/upi' || r === '/pay/card') return 300;
  if (r === '/pay/cash') return 180;
  if (r === '/ticket') return 30;
  return cfg.idleSeconds;
}
