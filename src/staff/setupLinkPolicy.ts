// What to do with an incoming kiosk setup link. No react-native imports: tested in plain Node.

export type SetupLinkDecision = 'apply' | 'staff-confirm';

/**
 * A kiosk that has no key yet takes its first setup link straight away. One that already has a key
 * must not be repointed by whoever opens a link on it (a QR code, a message): a staff member signs
 * in and confirms first.
 */
export function decideSetupLink(kiosk: { hasKey: boolean }): SetupLinkDecision {
  return kiosk.hasKey ? 'staff-confirm' : 'apply';
}

/** 'http://192.168.1.20:4000/api' → '192.168.1.20:4000'; what the confirmation shows. */
export function hostOfApiUrl(apiUrl: string): string {
  return apiUrl.replace(/^https?:\/\//i, '').replace(/[/?#].*$/, '');
}
