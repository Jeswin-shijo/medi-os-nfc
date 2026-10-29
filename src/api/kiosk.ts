import type { KioskClient } from './client';
import type {
  IdentifyResult,
  KioskConfig,
  KioskDepartment,
  KioskDoctor,
  PaymentMethod,
  RegisterInput,
  SendOtpResult,
  VisitView,
} from './types';

const BASE = '/reception/kiosk';

/** One function per kiosk route of the backend. */
export function kioskApi(client: KioskClient) {
  return {
    config: () => client.get<KioskConfig>(`${BASE}/config`),
    departments: () => client.get<KioskDepartment[]>(`${BASE}/departments`),
    doctors: (departmentCode: string) => client.get<KioskDoctor[]>(`${BASE}/doctors?department=${encodeURIComponent(departmentCode)}`),
    identifyCard: (cardId: string) => client.post<IdentifyResult>(`${BASE}/identify/card`, { cardId }),
    sendOtp: (phone: string) => client.post<SendOtpResult>(`${BASE}/otp/send`, { phone }),
    verifyOtp: (phone: string, code: string) => client.post<{ patients: IdentifyResult[] }>(`${BASE}/otp/verify`, { phone, code }),
    register: (input: RegisterInput) => client.post<IdentifyResult>(`${BASE}/register`, input),
    createVisit: (session: string, doctorId: string) => client.post<VisitView>(`${BASE}/visits`, { session, doctorId }),
    visit: (id: string) => client.get<VisitView>(`${BASE}/visits/${encodeURIComponent(id)}`),
    pay: (id: string, method: PaymentMethod) => client.post<VisitView>(`${BASE}/visits/${encodeURIComponent(id)}/pay`, { method }),
    cancel: (id: string) => client.post<VisitView>(`${BASE}/visits/${encodeURIComponent(id)}/cancel`),
    sampleComplete: (id: string) => client.post<VisitView>(`${BASE}/visits/${encodeURIComponent(id)}/sample-complete`),
  };
}

export type KioskApi = ReturnType<typeof kioskApi>;
