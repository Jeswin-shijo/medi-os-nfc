// No react-native imports: tested in plain Node.
import { KioskApiError } from '../api/client';
import { strings } from '../i18n/strings';

/**
 * What the kiosk state becomes when loading its configuration failed, or null for no change (a
 * revoked key has already moved it to setup). The stored address always stays in the state: staff
 * sign-in on the offline screen goes to that server.
 */
export function loadFailureUpdate(
  stored: { apiUrl: string },
  err: unknown,
  currentStatus: string,
): { status: 'offline'; loadError: string; address: string } | null {
  const network = err instanceof KioskApiError && err.code === 'NETWORK';
  if (!network && currentStatus === 'unconfigured') return null;
  return { status: 'offline', loadError: err instanceof Error ? err.message : strings.errors.generic, address: stored.apiUrl };
}
