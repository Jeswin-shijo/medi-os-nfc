// What to do with an incoming kiosk setup link. No react-native imports: tested in plain Node.

import type { SetupLink } from '../lib/deeplink';

export type SetupScreenDecision = 'apply' | 'confirm-with-staff' | 'manual-form' | 'removed' | 'staff';

/**
 * What the /setup route does. Only a fresh install (nothing stored at all) is set up by anyone:
 * a valid link applies at once, otherwise the open form. A kiosk that has ever been set up (a key,
 * or just a server address left after its key was removed) is never repointed by whoever opens a
 * link or a form: the next patients' data and the next staff password would go to that server.
 * - valid link: wait for a staff sign-in and confirmation;
 * - no link, key stored: the staff sign-in;
 * - no link, key removed: "This kiosk was removed. Ask an administrator." (staff can still sign in
 *   by holding the logo, and set a new key from Kiosk setup).
 * `link` is the parsed link, or null when there is none or it is not valid.
 */
export function decideSetupScreen({ hasKey, hadServer, link }: { hasKey: boolean; hadServer: boolean; link: SetupLink | null }): SetupScreenDecision {
  if (!hasKey && !hadServer) return link ? 'apply' : 'manual-form';
  if (link) return 'confirm-with-staff';
  return hasKey ? 'staff' : 'removed';
}

/** 'http://192.168.1.20:4000/api' → '192.168.1.20:4000'; what the confirmation shows. */
export function hostOfApiUrl(apiUrl: string): string {
  return apiUrl.replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '');
}
