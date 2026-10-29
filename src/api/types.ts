// Mirrors of the backend's kiosk answers (src/modules/reception and opd/availability.ts).

export type PaymentMethod = 'UPI' | 'CASH' | 'CARD';
export type VisitStatus = 'awaiting-payment' | 'paid' | 'cancelled' | 'expired';
export type AvailabilityState = 'now' | 'busy' | 'later' | 'done' | 'off';

export interface KioskConfig {
  kioskName: string;
  hospital: { name: string; address: string; phone: string };
  printSlips: boolean;
  methods: { upi: boolean; cash: boolean; card: boolean };
  /** Sample mode: the screens must say SAMPLE. */
  sample: { payments: boolean; sms: boolean };
  /** Finding a record by mobile number needs an SMS provider. */
  findByPhone: boolean;
  idleSeconds: number;
  slipFooter: string;
  trackingBaseUrl: string;
  clinic: { date: string; utcOffsetMinutes: number; serverTime: string };
}

export interface KioskDepartment {
  code: string;
  name: string;
  icon: string;
  color: string;
  doctorCount: number;
}

export interface Availability {
  state: AvailabilityState;
  label: string;
  bookable: boolean;
  /** 'HH:mm', set when state is 'later' */
  startsAt?: string;
}

export interface KioskDoctor {
  id: string;
  name: string;
  qualifications: string;
  department: string;
  departmentCode: string;
  /** Whole rupees. */
  fee: number;
  room: string;
  availability: Availability;
}

export interface PatientSummary {
  uhid: string;
  name: string;
  age: number;
  gender: string;
  /** Masked (`••••• 43210`) unless the patient proved who they are with a code. */
  phone: string;
  lastVisit?: string;
  lastDepartment?: string;
  address?: string;
}

export interface KioskTokenView {
  label: string;
  status: string;
  ahead: number;
  room: string;
  doctorName: string;
  department: string;
  trackCode: string;
  trackUrl: string;
  issuedAt: string;
  appointmentTime?: string;
}

export interface IdentifyResult {
  /** Opaque; sent back with later steps. */
  session: string;
  patient: PatientSummary;
  activeToken: KioskTokenView | null;
  appointmentToday: { time: string } | null;
}

export interface VisitView {
  id: string;
  status: VisitStatus;
  method?: PaymentMethod;
  fee: number;
  sample: boolean;
  doctor: { id: string; name: string; department: string; room: string };
  patient: { name: string; uhid: string };
  /** Cash only: the four digits the patient shows at the counter. */
  paymentCode?: string;
  upiUri?: string;
  expiresAt: string;
  paidAt?: string;
  paidAtDisplay?: string;
  transactionId?: string;
  opNumber?: string;
  billNumber?: string;
  token?: KioskTokenView;
  kioskName: string;
  via: string;
  createdAt: string;
}

export interface SendOtpResult {
  found: boolean;
  resendAfterSeconds: number;
  /** Sample SMS mode only. */
  sampleCode?: string;
}

export interface RegisterInput {
  name: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  /** Whole years; required unless dob is given. */
  age?: number;
  /** YYYY-MM-DD */
  dob?: string;
  /** Register a new person although the number already has records. */
  confirmNew?: boolean;
}
