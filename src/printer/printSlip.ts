import type { KioskTokenView, PatientSummary } from '../api/types';

/** A token slip for a patient who already holds a token (no fee line). */
export interface TokenSlip {
  token: KioskTokenView;
  patient?: PatientSummary;
}

export type PrintResult = { ok: true } | { ok: false; reason: string };

/**
 * Prints a token slip on the kiosk's printer. Never throws: a failure is an answer, and the screen
 * sends the patient to the counter for the slip.
 *
 * Until the print service exists (Task 23) the kiosk has no printer, so this prints nothing and says so.
 */
export async function printSlip(slip: TokenSlip): Promise<PrintResult> {
  void slip;
  return { ok: false, reason: 'No printer is set up on this kiosk.' };
}
