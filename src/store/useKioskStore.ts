import { create } from 'zustand';

export type KioskStep =
  | 'WELCOME'
  | 'PATIENT_CONFIRM'
  | 'SELECT_DEPT'
  | 'SELECT_DOCTOR'
  | 'PAYMENT_MODE'
  | 'PAYMENT_PROCESS'
  | 'PAYMENT_SUCCESS'
  | 'TICKET_DISPLAY'
  | 'FORGOT_CARD'
  | 'NEW_PATIENT'
  | 'CARD_WRITER';

export interface Patient {
  id: string;
  uhid: string;
  name: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  phone: string;
  lastVisit?: string;
  address?: string;
}

export interface Department {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Doctor {
  id: string;
  name: string;
  deptId: string;
  deptName: string;
  qualifications: string;
  fee: number;
  availability: string;
  availableStatus: 'now' | 'soon' | 'later';
  room: string;
}

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD';

export interface OpTicket {
  opNumber: string;
  queueToken: string;
  patient: Patient;
  doctor: Doctor;
  paymentMethod: PaymentMethod;
  amount: number;
  transactionId: string;
  timestamp: string;
}

interface KioskState {
  step: KioskStep;
  patient: Patient | null;
  selectedDept: Department | null;
  selectedDoctor: Doctor | null;
  paymentMethod: PaymentMethod | null;
  currentTicket: OpTicket | null;
  nfcStatus: 'idle' | 'listening' | 'reading' | 'success' | 'error';
  nfcMessage: string;

  // Actions
  setStep: (step: KioskStep) => void;
  setPatient: (patient: Patient | null) => void;
  setSelectedDept: (dept: Department | null) => void;
  setSelectedDoctor: (doctor: Doctor | null) => void;
  setPaymentMethod: (method: PaymentMethod | null) => void;
  setCurrentTicket: (ticket: OpTicket | null) => void;
  setNfcStatus: (status: 'idle' | 'listening' | 'reading' | 'success' | 'error', message?: string) => void;
  resetSession: () => void;
}

export const useKioskStore = create<KioskState>((set) => ({
  step: 'WELCOME',
  patient: null,
  selectedDept: null,
  selectedDoctor: null,
  paymentMethod: null,
  currentTicket: null,
  nfcStatus: 'idle',
  nfcMessage: 'Ready to scan NFC card',

  setStep: (step) => set({ step }),
  setPatient: (patient) => set({ patient }),
  setSelectedDept: (selectedDept) => set({ selectedDept }),
  setSelectedDoctor: (selectedDoctor) => set({ selectedDoctor }),
  setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
  setCurrentTicket: (currentTicket) => set({ currentTicket }),
  setNfcStatus: (nfcStatus, nfcMessage = '') => set({ nfcStatus, nfcMessage }),
  resetSession: () =>
    set({
      step: 'WELCOME',
      patient: null,
      selectedDept: null,
      selectedDoctor: null,
      paymentMethod: null,
      currentTicket: null,
      nfcStatus: 'listening',
      nfcMessage: 'Tap Your Patient Card',
    }),
}));

