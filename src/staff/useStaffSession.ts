import { create } from 'zustand';
import type { SetupLink } from '../lib/deeplink';
import type { StaffUser } from '../api/staff';

interface StaffSessionState {
  /** In memory only: gone when the app closes, when staff exit, or after 2 idle minutes. */
  token: string | null;
  user: StaffUser | null;
  /** Last touch on a staff screen (ms); the sign-in screen counts too, so it never sits open. */
  lastActive: number;
  /** A setup link waiting for a staff member to sign in and confirm. */
  pendingLink: SetupLink | null;
  signIn: (token: string, user: StaffUser) => void;
  touch: () => void;
  end: () => void;
  holdSetupLink: (link: SetupLink) => void;
  dropSetupLink: () => void;
}

export const useStaffSession = create<StaffSessionState>((set) => ({
  token: null,
  user: null,
  lastActive: Date.now(),
  pendingLink: null,
  signIn: (token, user) => set({ token, user, lastActive: Date.now() }),
  touch: () => set({ lastActive: Date.now() }),
  // Ending the session also drops a link that was never confirmed.
  end: () => set({ token: null, user: null, pendingLink: null }),
  holdSetupLink: (link) => set({ pendingLink: link, lastActive: Date.now() }),
  dropSetupLink: () => set({ pendingLink: null }),
}));
