import type { KioskConfig } from '../api/types';

const MINUTE = 60_000;
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The clinic's "now": the server's moment (the tablet's clock may be off), with the
 * calendar day pinned to the clinic date like the backend's `clinicNow()`. Development
 * pins that day to the demo schedule; in production it is simply today.
 * Read the result with `formatHeaderTime`, which applies the clinic's UTC offset.
 */
export function clinicClock(clinic: KioskConfig['clinic'], deviceNow: number = Date.now()): () => Date {
  const skew = Date.parse(clinic.serverTime) - deviceNow;
  const offset = clinic.utcOffsetMinutes * MINUTE;
  const pinned = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clinic.date);
  return () => {
    const moment = Date.now() + skew;
    if (!pinned) return new Date(moment);
    const local = new Date(moment + offset);
    const day = Date.UTC(Number(pinned[1]), Number(pinned[2]) - 1, Number(pinned[3]));
    const timeOfDay = Date.UTC(1970, 0, 1, local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds());
    return new Date(day + timeOfDay - offset);
  };
}

/** 'Sat, 26 Sep 2026  10:24 AM' on the clinic's wall clock, without `Intl`. */
export function formatHeaderTime(d: Date, utcOffsetMinutes: number): string {
  const local = new Date(d.getTime() + utcOffsetMinutes * MINUTE);
  const hours = local.getUTCHours();
  const minutes = String(local.getUTCMinutes()).padStart(2, '0');
  const day = `${DAYS[local.getUTCDay()]}, ${local.getUTCDate()} ${MONTHS[local.getUTCMonth()]} ${local.getUTCFullYear()}`;
  return `${day}  ${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}
