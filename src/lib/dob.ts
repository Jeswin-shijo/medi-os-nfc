// No react-native or expo imports here: the tests run in plain Node.

/** The oldest year the kiosk accepts. */
const OLDEST_YEAR = 1900;

/**
 * Day, month and year as typed → 'YYYY-MM-DD', or null when it is not a real date,
 * is after `today`, or the year is not four digits (or before 1900).
 */
export function parseDob(day: string, month: string, year: string, today: Date = new Date()): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  if (y < OLDEST_YEAR) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const limit = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  if (date.getTime() > limit) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
