// No react-native or expo imports here: the tests run in plain Node.
import type { PaymentMethod, VisitStatus } from '../api/types';

/** How often a waiting payment screen asks the server. */
export const POLL_MS = 2000;
/** A paid visit that has no token yet: ask this long before sending the patient to the desk. */
export const TOKEN_WAIT_MS = 10_000;
/** Failed answers in a row before "Reconnecting…" shows: one slow answer is not worth flashing for. */
export const RECONNECT_AFTER = 2;

/** The longest a payment can wait, per method (backend: UPI and card 5 min, cash 30 min). */
export const MAX_WAIT_SECONDS: Record<PaymentMethod, number> = { UPI: 300, CARD: 300, CASH: 1800 };

export type VisitLike = { status: VisitStatus; token?: unknown };
export type PollKind = 'waiting' | 'paid' | 'closed';

export function classifyVisit(visit: { status: VisitStatus }): PollKind {
  if (visit.status === 'paid') return 'paid';
  if (visit.status === 'cancelled' || visit.status === 'expired') return 'closed';
  return 'waiting';
}

/** What the screen should do with one answer. `done` means an earlier answer already did it. */
export type PollAction = PollKind | 'done';

export interface PollTracker {
  /** An answer (from polling or from a simulate button): the first paid or closed one wins, once. */
  accept(visit: { status: VisitStatus }): PollAction;
  /** The request failed; true once it has failed often enough to say "Reconnecting…". */
  failed(): boolean;
  finished(): boolean;
}

/**
 * The polling state machine: `paid` and `closed` are each reported at most once in total, so a poll
 * and a Simulate button answering together can never move the screen on twice.
 */
export function createPollTracker(): PollTracker {
  let finished = false;
  let failures = 0;
  return {
    accept(visit) {
      failures = 0;
      if (finished) return 'done';
      const kind = classifyVisit(visit);
      if (kind !== 'waiting') finished = true;
      return kind;
    },
    failed() {
      failures++;
      return failures >= RECONNECT_AFTER;
    },
    finished: () => finished,
  };
}

/**
 * Whole seconds until `expiresAt`, never more than `maxSeconds` (a tablet clock that runs behind
 * must not show a longer wait than the backend allows) and never below 0. A bad date counts as
 * 0 left: the screen then just keeps asking the server.
 */
export function secondsLeft(expiresAt: string, nowMs: number, maxSeconds: number): number {
  const end = Date.parse(expiresAt);
  if (Number.isNaN(end)) return 0;
  return Math.max(0, Math.min(maxSeconds, Math.ceil((end - nowMs) / 1000)));
}

export type TokenWait = 'ready' | 'waiting' | 'gave-up';

/**
 * A paid visit should carry its token; rarely it takes a few seconds. `ready` once there is one,
 * `waiting` while within the limit, then `gave-up`: the screen says "see the front desk" instead
 * of spinning on, and never asks for payment again.
 */
export function tokenWaitState(visit: VisitLike, startedAtMs: number, nowMs: number, limitMs: number = TOKEN_WAIT_MS): TokenWait {
  if (visit.token) return 'ready';
  return nowMs - startedAtMs >= limitMs ? 'gave-up' : 'waiting';
}

/** 'upi' | 'cash' | 'card' for the route of a method. */
export const methodSlug = (method: PaymentMethod): 'upi' | 'cash' | 'card' => method.toLowerCase() as 'upi' | 'cash' | 'card';

/** How far the server's clock is ahead of this tablet's (ms), read when the kiosk configuration arrives. 0 if unreadable. */
export function serverSkewMs(serverTime: string, deviceNowMs: number): number {
  const server = Date.parse(serverTime);
  return Number.isNaN(server) ? 0 : server - deviceNowMs;
}

/**
 * Whether a fresh order can be shown: UPI needs its QR link and cash its counter code; a card needs
 * nothing more (the card machine shows the amount). Anything but a waiting visit is not an order to show.
 */
export function orderReady(visit: { status: VisitStatus; upiUri?: string; paymentCode?: string }, method: PaymentMethod): boolean {
  if (visit.status !== 'awaiting-payment') return false;
  if (method === 'UPI') return !!visit.upiUri;
  if (method === 'CASH') return !!visit.paymentCode;
  return true;
}

/** What a payment screen does with the visit in the flow. Paid and closed visits stay: the screen itself handles those outcomes. */
export type PayGuard = 'stay' | 'to-welcome' | 'to-payment';

export function payScreenGuard(visit: { method?: PaymentMethod; status: VisitStatus; upiUri?: string; paymentCode?: string } | undefined, method: PaymentMethod): PayGuard {
  if (!visit) return 'to-welcome';
  if (visit.method !== method) return 'to-payment';
  // While still awaiting payment the screen needs its order (the QR, the code); after paid or closed it does not.
  if (visit.status === 'awaiting-payment') {
    if (method === 'UPI' && !visit.upiUri) return 'to-payment';
    if (method === 'CASH' && !visit.paymentCode) return 'to-payment';
  }
  return 'stay';
}
