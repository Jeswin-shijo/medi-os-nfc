// No react-native or expo imports here: the tests run in plain Node.

/** The oldest age the backend accepts. */
export const MAX_AGE = 120;

/**
 * Day, month and year as typed → 'YYYY-MM-DD', or null when it is not a real date,
 * is after `today` (the local calendar day, as the patient sees it), would make the patient
 * older than 120, or the year is not four digits.
 */
export function parseDob(day: string, month: string, year: string, today: Date = new Date()): string | null {
  if (!/^\d{1,2}$/.test(day) || !/^\d{1,2}$/.test(month) || !/^\d{4}$/.test(year)) return null;
  const d = Number(day);
  const m = Number(month);
  const y = Number(year);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  const limit = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  if (date.getTime() > limit) return null;
  // Turning 121 is too old: the earliest allowed birthday is 120 years back, same day and month.
  const earliest = Date.UTC(today.getFullYear() - MAX_AGE - 1, today.getMonth(), today.getDate() + 1);
  if (date.getTime() < earliest) return null;
  return `${year}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}
