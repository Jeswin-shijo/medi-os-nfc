import { router } from 'expo-router';
import { create } from 'zustand';
import type { IdentifyResult, KioskDepartment, KioskDoctor, KioskTokenView, PatientSummary, VisitView } from '../api/types';
import { useKioskApp } from '../store/useKioskApp';
import { useFind } from './useFind';

export type IdentifiedVia = 'card' | 'otp' | 'register';

interface FlowData {
  /** Opaque kiosk session from identification; sent with later steps. */
  session?: string;
  patient?: PatientSummary;
  via?: IdentifiedVia;
  appointmentToday?: { time: string } | null;
  activeToken?: KioskTokenView | null;
  department?: KioskDepartment;
  doctor?: KioskDoctor;
  visit?: VisitView;
}

interface FlowState extends FlowData {
  /** True while `resetFlow` fades back to Welcome: the Stack fades instead of sliding. */
  resetting: boolean;
  setIdentity: (result: IdentifyResult, via: IdentifiedVia) => void;
  setDepartment: (department: KioskDepartment) => void;
  setDoctor: (doctor: KioskDoctor) => void;
  setVisit: (visit: VisitView) => void;
  /** Forget this patient and go back to Welcome. Cancels an unpaid UPI or card visit; never a cash or paid one. */
  resetFlow: () => void;
}

const EMPTY: Record<keyof FlowData, undefined> = {
  session: undefined,
  patient: undefined,
  via: undefined,
  appointmentToday: undefined,
  activeToken: undefined,
  department: undefined,
  doctor: undefined,
  visit: undefined,
};

/** How long the fade back to Welcome takes before forward screens slide again. */
const RESET_FADE_MS = 400;

/** Counts resets and new patients, so a late clean-up never wipes a patient who started meanwhile. */
let generation = 0;

export const useFlow = create<FlowState>((set, get) => ({
  ...EMPTY,
  resetting: false,

  setIdentity(result, via) {
    generation++;
    // A new person: nothing chosen for the previous one carries over.
    set({
      ...EMPTY,
      resetting: false,
      session: result.session,
      patient: result.patient,
      via,
      appointmentToday: result.appointmentToday,
      activeToken: result.activeToken,
    });
  },

  setDepartment(department) {
    set({ department, doctor: undefined });
  },

  setDoctor(doctor) {
    set({ doctor });
  },

  setVisit(visit) {
    set({ visit });
  },

  resetFlow() {
    const { visit } = get();
    // A cash visit stays open for the counter (the patient may already be walking there);
    // staff confirm it later and the slip prints at the desk.
    if (visit && visit.status === 'awaiting-payment' && visit.method !== 'CASH') {
      const api = useKioskApp.getState().api;
      void api?.cancel(visit.id).catch(() => undefined);
    }
    const reset = ++generation;
    set({ resetting: true });
    // Nobody's number or family list stays behind for the next person.
    useFind.getState().clear();
    // Let the Stack pick up the fade before the screens go: two separate commits.
    setTimeout(() => {
      // Back to the Welcome screen already in the stack (or onto it): history never piles up over a day.
      router.dismissTo('/');
      // The leaving screen still shows this patient while it fades, so forget them only afterwards.
      setTimeout(() => {
        if (reset === generation) set({ ...EMPTY, resetting: false });
      }, RESET_FADE_MS);
    }, 0);
  },
}));
