// The OP ticket (and the token-only slip) laid out for 48 columns. No react-native imports: tested in plain Node.
import type { KioskTokenView, VisitView } from '../api/types';
import { strings } from '../i18n/strings';
import { COLUMNS, EscPos, printable, type Align, type Scale } from './escpos';

/** 'OP Number      : ' — labels padded to 15, then ': '; values wrap under their own column. */
const LABEL_WIDTH = 15;
const VALUE_INDENT = ' '.repeat(LABEL_WIDTH + 2);
const VALUE_WIDTH = COLUMNS - VALUE_INDENT.length;
/** The token prints double width and height. */
const TOKEN_SCALE: Scale = 2;
/** Blank lines after the footer, so it clears the cutter. */
const FEED_BEFORE_CUT = 4;

/** The identified patient. A visit carries only the name and ID, so age and sex come from here. */
export interface TicketPatient {
  name?: string;
  uhid?: string;
  age?: number;
  gender?: string;
}

interface TicketCommon {
  hospitalName: string;
  hospitalPhone?: string;
  footer: string;
  patient?: TicketPatient;
}

/**
 * A paid visit (the OP ticket), or just a token (a patient who already holds one today: no OP
 * number and no fee line; `when` is the token's time, '26 Sep 2026, 10:24 AM').
 */
export type TicketInput = TicketCommon & ({ visit: VisitView } | { token: KioskTokenView; when?: string });

type Block = { kind: 'text'; lines: string[]; align: Align; bold?: boolean; scale?: Scale } | { kind: 'rule' } | { kind: 'qr'; data: string };

/** Word-wraps printable text to `width` columns; a word longer than a line is split. */
function wrap(text: string, width: number): string[] {
  const words = printable(text.replace(/\s+/g, ' ').trim()).split(' ').filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (let word of words) {
    while (word.length > width) {
      if (current) lines.push(current);
      current = '';
      lines.push(word.slice(0, width));
      word = word.slice(width);
    }
    if (!current) current = word;
    else if (current.length + 1 + word.length <= width) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

/** 'Label          : value', continuing under the value column. Nothing for an empty value. */
function row(label: string, value: string | undefined): string[] {
  const lines = wrap(value ?? '', VALUE_WIDTH);
  return lines.map((line, i) => (i === 0 ? `${label.padEnd(LABEL_WIDTH)}: ${line}` : `${VALUE_INDENT}${line}`));
}

/** The slip as blocks, read by both the printer bytes and the text preview, so the two never drift apart. */
function layout(input: TicketInput): Block[] {
  const visit = 'visit' in input ? input.visit : undefined;
  const token = 'visit' in input ? input.visit.token : input.token;
  const when = 'visit' in input ? input.visit.paidAtDisplay : input.when;
  const s = strings.slip;

  const blocks: Block[] = [];
  const rule = () => blocks.push({ kind: 'rule' });
  const centre = (text: string, options: { bold?: boolean; scale?: Scale } = {}) => {
    const lines = wrap(text, Math.floor(COLUMNS / (options.scale ?? 1)));
    if (lines.length) blocks.push({ kind: 'text', lines, align: 'center', ...options });
  };
  const rows = (pairs: [string, string | undefined][]) => {
    const lines = pairs.flatMap(([label, value]) => row(label, value));
    if (lines.length) blocks.push({ kind: 'text', lines, align: 'left' });
  };

  centre(input.hospitalName.toUpperCase(), { bold: true });
  if (input.hospitalPhone) centre(s.phone(input.hospitalPhone));
  centre(visit ? s.opTitle : s.tokenTitle);
  rule();

  if (visit?.opNumber) {
    rows([[s.opNumber, visit.opNumber]]);
    rule();
  }

  if (token) {
    centre(token.label, { bold: true, scale: TOKEN_SCALE });
    centre(s.roomDoctor(token.room, token.doctorName));
    rule();
  }

  rows([
    [s.patientName, visit?.patient.name ?? input.patient?.name],
    [s.patientId, visit?.patient.uhid ?? input.patient?.uhid],
    [s.ageSex, s.ageSexValue(input.patient?.age, input.patient?.gender)],
    [s.department, visit?.doctor.department ?? token?.department],
    [s.doctor, visit?.doctor.name ?? token?.doctorName],
    [s.fee, visit ? s.feeValue(visit.fee, visit.method) : undefined],
    [s.when, when],
  ]);
  if (visit?.sample) centre(s.sample, { bold: true });
  rule();

  if (token?.trackUrl) {
    blocks.push({ kind: 'qr', data: token.trackUrl });
    centre(s.scan);
  }
  for (const paragraph of input.footer.split('\n')) centre(paragraph);
  return blocks;
}

/** The ESC/POS slip: header, OP number, big token, patient and visit rows, tracking QR, footer, cut. */
export function buildTicket(input: TicketInput): EscPos {
  const p = new EscPos().init();
  for (const block of layout(input)) {
    if (block.kind === 'rule') p.align('left').rule();
    else if (block.kind === 'qr') p.align('center').qr(block.data);
    else {
      p.align(block.align);
      if (block.bold) p.bold(true);
      if (block.scale) p.size(block.scale, block.scale);
      for (const line of block.lines) p.line(line);
      if (block.scale) p.size(1, 1);
      if (block.bold) p.bold(false);
    }
  }
  return p.feed(FEED_BEFORE_CUT).cut();
}

const centred = (line: string): string => `${' '.repeat(Math.max(0, Math.floor((COLUMNS - line.length) / 2)))}${line}`;

/** The slip's text without control bytes, one string per printed line (the QR shows as a placeholder). */
export function ticketPreviewLines(input: TicketInput): string[] {
  return layout(input).flatMap((block) => {
    if (block.kind === 'rule') return ['-'.repeat(COLUMNS)];
    if (block.kind === 'qr') return [centred('[QR code]')];
    return block.align === 'center' ? block.lines.map(centred) : block.lines;
  });
}
