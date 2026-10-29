// No react-native imports: tested in plain Node.
import { isUnder, normalizeRoute } from './steps';

/** How long "Are you still there?" waits for a touch before the kiosk starts over. */
export const WARNING_SECONDS = 10;

/**
 * Seconds without a touch before "Are you still there?" appears, or null where the kiosk never
 * asks: the welcome screen (nothing to reset), setup, the staff menu (it signs out on its own),
 * the developer gallery, and the ticket (its own 30 s ring goes back to Welcome; nothing is lost).
 */
export function idleLimitSeconds(route: string, cfg: { idleSeconds: number }): number | null {
  const r = normalizeRoute(route);
  if (r === '/' || r === '/setup' || r === '/ticket' || isUnder(r, '/staff') || isUnder(r, '/_dev')) return null;
  // Paying takes a while (finding the phone, walking to the counter).
  if (r === '/pay/upi' || r === '/pay/card') return 300;
  if (r === '/pay/cash') return 180;
  return cfg.idleSeconds;
}

/**
 * The idle clock behind "Are you still there?". `askedFor()` is the route the question was
 * asked on, or null. The question always belongs to one screen: a new screen (`enter`) drops
 * it and starts that screen's own clock, so a patient who pays on their phone while the
 * question is up is never sent back to Welcome from the next screen. A store for
 * `useSyncExternalStore`: subscribers hear only when the question appears or goes.
 */
export class IdleClock {
  private route = '';
  private limit: number | null = null;
  private asked: string | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private readonly listeners = new Set<() => void>();

  askedFor = (): string | null => this.asked;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** A new screen (or a new limit for it): no question carried over, the clock starts over. */
  enter = (route: string, limitSeconds: number | null): void => {
    this.route = route;
    this.limit = limitSeconds;
    this.touch();
  };

  /** A touch: the question goes away and the clock starts over. */
  touch = (): void => {
    this.clearTimer();
    this.setAsked(null);
    if (this.limit === null) return;
    const route = this.route;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      this.setAsked(route);
    }, this.limit * 1000);
  };

  /** Starting over (answered, or time ran out): no question and no clock until the next screen or touch. */
  stop = (): void => {
    this.clearTimer();
    this.setAsked(null);
  };

  private clearTimer(): void {
    if (this.timer !== undefined) clearTimeout(this.timer);
    this.timer = undefined;
  }

  private setAsked(route: string | null): void {
    if (this.asked === route) return;
    this.asked = route;
    this.listeners.forEach((listener) => listener());
  }
}
