import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { KioskTokenView, VisitView } from '../api/types';
import { loadPrinterSettings, type PrinterSettings } from '../config/kioskConfigStore';
import { useFlow } from '../flow/useFlow';
import { formatSlipTime } from '../lib/time';
import { useKioskApp } from '../store/useKioskApp';
import { PrintLedger, type PrintJobState } from './printLedger';
import { printTicket, type PrintResult } from './printService';
import { buildTicket, type TicketInput, type TicketPatient } from './ticket';

// The one way screens print: the OP ticket (/ticket) and the token slip (/has-token).

export type { PrintResult };

/** A paid visit (the OP ticket), or a token the patient already holds (no OP number, no fee line). */
export type Slip = { visit: VisitView; patient?: TicketPatient } | { token: KioskTokenView; patient?: TicketPatient };

/** One slip and two more at most: paper is not wasted by a patient pressing again and again. */
export const MAX_PRINTS = 3;

const ledger = new PrintLedger(MAX_PRINTS);

/**
 * Prints are counted per patient session: a patient who taps their card again later in the day
 * starts afresh on their token slip, while a screen that mounts again within the session does not.
 */
const slipKey = (session: string, slip: Slip): string =>
  `${session}|${'visit' in slip ? `visit:${slip.visit.id}` : `token:${slip.token.trackCode || slip.token.label}`}`;

/**
 * Prints a slip on the kiosk's printer (the saved one unless `printer` is given). Never throws: a
 * failure is an answer, and the screen sends the patient to the counter for the slip.
 */
export async function printSlip(slip: Slip, printer?: PrinterSettings | null): Promise<PrintResult> {
  try {
    const settings = printer === undefined ? await loadPrinterSettings() : printer;
    if (!settings) return { ok: false, reason: 'No printer is set up on this kiosk.' };
    const config = useKioskApp.getState().config;
    const common = {
      hospitalName: config?.hospital.name ?? '',
      hospitalPhone: config?.hospital.phone || undefined,
      footer: config?.slipFooter ?? '',
      patient: slip.patient,
    };
    const input: TicketInput =
      'visit' in slip
        ? { ...common, visit: slip.visit }
        : { ...common, token: slip.token, when: config ? formatSlipTime(slip.token.issuedAt, config.clinic) : undefined };
    return await printTicket(buildTicket(input).bytes(), settings);
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : 'The slip could not be printed.' };
  }
}

async function send(key: string, slip: Slip, printer: PrinterSettings): Promise<void> {
  const result = await printSlip(slip, printer);
  ledger.finish(key, result.ok);
}

/**
 * - `off`: this kiosk does not print slips (settings); show nothing.
 * - `checking`: reading the printer settings.
 * - `no-printer`: slips are on but no printer is set up here; the patient collects one at the counter.
 * - otherwise how the last print of this slip went.
 */
export type SlipStatus = 'off' | 'checking' | 'no-printer' | PrintJobState;

export interface SlipPrinter {
  status: SlipStatus;
  /** Prints so far for this slip (the automatic one included). */
  used: number;
  /** A printer is ready, nothing is printing and the limit is not reached. */
  canPrint: boolean;
  print: () => void;
}

/**
 * Printing for one slip. With `auto`, prints once by itself as soon as the printer settings are
 * read: exactly once per slip, whatever re-mounts or repeated effects happen (the ledger lives
 * outside the screen). Printing never blocks the screen; the result shows in `status`.
 */
export function usePrintSlip(slip: Slip | null, { auto = false }: { auto?: boolean } = {}): SlipPrinter {
  const printSlips = useKioskApp((s) => s.config?.printSlips !== false);
  // undefined while reading, null when none is saved.
  const [printer, setPrinter] = useState<PrinterSettings | null | undefined>(undefined);
  const session = useFlow((s) => s.session) ?? '';
  const key = slip ? slipKey(session, slip) : '';
  const record = useSyncExternalStore(ledger.subscribe, () => ledger.get(key));

  useEffect(() => {
    let live = true;
    loadPrinterSettings().then(
      (saved) => live && setPrinter(saved),
      () => live && setPrinter(null),
    );
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!auto || !printSlips || !printer || !slip) return;
    if (ledger.claimFirst(key)) void send(key, slip, printer);
  }, [auto, printSlips, printer, slip, key]);

  const print = useCallback(() => {
    if (!printSlips || !printer || !slip) return;
    if (ledger.claim(key)) void send(key, slip, printer);
  }, [printSlips, printer, slip, key]);

  const status: SlipStatus = !printSlips ? 'off' : printer === undefined ? 'checking' : printer === null ? 'no-printer' : record.state;
  const canPrint = !!printer && printSlips && !!slip && record.state !== 'printing' && record.used < MAX_PRINTS;
  return { status, used: record.used, canPrint, print };
}
