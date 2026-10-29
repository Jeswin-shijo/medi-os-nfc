// What to do with an incoming kiosk setup link. No react-native imports: tested in plain Node.

import type { SetupLink } from '../lib/deeplink';

export type SetupScreenDecision = 'apply' | 'confirm-with-staff' | 'manual-form' | 'staff';

/**
 * What the /setup route does. A kiosk with no key yet is set up by anyone: a valid link applies at
 * once, otherwise the open form. A kiosk that already has a key is never repointed by whoever opens
 * a link or the form (the next patients' data, and the next staff password, would go to that server):
 * a valid link waits for a staff sign-in and confirmation, anything else goes to the staff sign-in.
 * `link` is the parsed link, or null when there is none or it is not valid.
 */
export function decideSetupScreen({ hasKey, link }: { hasKey: boolean; link: SetupLink | null }): SetupScreenDecision {
  if (!hasKey) return link ? 'apply' : 'manual-form';
  return link ? 'confirm-with-staff' : 'staff';
}

/** 'http://192.168.1.20:4000/api' → '192.168.1.20:4000'; what the confirmation shows. */
export function hostOfApiUrl(apiUrl: string): string {
  return apiUrl.replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '');
}
