import { create } from 'zustand';
import type { IdentifyResult } from '../api/types';

/**
 * What the Find my record screens hand to each other (kept out of the route URLs, which would
 * put a mobile number in the navigation history). Cleared whenever the kiosk starts over.
 */
interface FindState {
  /** Ten digits. */
  phone: string;
  /** Sample SMS mode: the code the server returned. */
  sampleCode?: string;
  resendAfterSeconds: number;
  /** A message for the mobile number screen (for example "That code has expired"). */
  notice: string | null;
  /** True only for the not-found to Register (and Register to Find) hand-off: the next screen may prefill the number. */
  handoff: boolean;
  /** Everyone on the number, after the code was right and more than one person came back. */
  candidates: IdentifyResult[];
  setPhone: (phone: string) => void;
  /** Pass the number to the next screen, which may show it (the only time it may). */
  handOff: (phone: string) => void;
  /** A screen entered fresh: keep a handed-over number, otherwise forget everything. */
  enter: () => void;
  setCode: (code: { sampleCode?: string; resendAfterSeconds: number }) => void;
  setNotice: (notice: string | null) => void;
  setCandidates: (candidates: IdentifyResult[]) => void;
  clear: () => void;
}

const EMPTY = { phone: '', sampleCode: undefined, resendAfterSeconds: 30, notice: null, candidates: [], handoff: false };

export const useFind = create<FindState>((set) => ({
  ...EMPTY,
  setPhone: (phone) => set({ phone }),
  handOff: (phone) => set({ phone, handoff: true }),
  enter: () =>
    set((s) => (s.handoff ? { handoff: false } : { ...EMPTY })),
  setCode: ({ sampleCode, resendAfterSeconds }) => set({ sampleCode, resendAfterSeconds }),
  setNotice: (notice) => set({ notice }),
  setCandidates: (candidates) => set({ candidates }),
  clear: () => set({ ...EMPTY }),
}));
