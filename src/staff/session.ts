// The staff session's rules. No react-native imports: tested in plain Node.

/** The staff menu signs out after this long without a touch. */
export const STAFF_IDLE_MS = 120_000;

/** Roles that may use the staff menu: the ones the card-linking route accepts. */
export const STAFF_ROLES: readonly string[] = ['admin', 'staff', 'nurse', 'doctor'];

export const canUseStaffMenu = (role: string | undefined | null): boolean => !!role && STAFF_ROLES.includes(role.toLowerCase());

export const staffSessionExpired = (lastActiveMs: number, nowMs: number, limitMs: number = STAFF_IDLE_MS): boolean => nowMs - lastActiveMs >= limitMs;

/** Whole seconds left before the session ends (never below 0). */
export const staffSecondsLeft = (lastActiveMs: number, nowMs: number, limitMs: number = STAFF_IDLE_MS): number =>
  Math.max(0, Math.ceil((lastActiveMs + limitMs - nowMs) / 1000));
