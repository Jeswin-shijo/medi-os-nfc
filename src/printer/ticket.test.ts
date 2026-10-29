import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { KioskTokenView, VisitView } from '../api/types';
import { COLUMNS } from './escpos';
import { buildTicket, ticketPreviewLines, type TicketInput } from './ticket';

const token: KioskTokenView = {
  label: 'G-024',
  status: 'waiting',
  ahead: 3,
  room: 'Room 101',
  doctorName: 'Dr. Shajin',
  department: 'General Medicine',
  trackCode: 'K7Q2M9',
  trackUrl: 'https://medi-os-ai.vercel.app/track#K7Q2M9',
  issuedAt: '2026-09-26T04:54:00.000Z',
};

const visit: VisitView = {
  id: 'v1',
  status: 'paid',
  method: 'UPI',
  fee: 300,
  sample: false,
  doctor: { id: 'd1', name: 'Dr. Shajin', department: 'General Medicine', room: 'Room 101' },
  patient: { name: 'Ramesh Kumar', uhid: 'MHK202600003' },
  expiresAt: '2026-09-26T05:00:00.000Z',
  paidAt: '2026-09-26T04:54:00.000Z',
  paidAtDisplay: '26 Sep 2026, 10:24 AM',
  transactionId: 'TXN123',
  opNumber: 'OP-20260926-0042',
  billNumber: 'OPB-20260926-0042',
  token,
  kioskName: 'Front entrance',
  via: 'card',
  createdAt: '2026-09-26T04:50:00.000Z',
};

const input: TicketInput = {
  hospitalName: "St. Mary's Multi Speciality Hospital",
  hospitalPhone: '04652 123456',
  footer: 'Please wait for your token number. Thank you!',
  visit,
  patient: { age: 45, gender: 'Male' },
};

/** The ESC/POS QR "store data" command: GS ( k pL pH 31 50 30. */
const hasQrStore = (bytes: Uint8Array): boolean =>
  bytes.some((b, i) => b === 0x1d && bytes[i + 1] === 0x28 && bytes[i + 2] === 0x6b && bytes[i + 5] === 0x31 && bytes[i + 6] === 0x50 && bytes[i + 7] === 0x30);

const find = (lines: string[], start: string): string | undefined => lines.find((l) => l.startsWith(start));

describe('ticketPreviewLines', () => {
  const lines = ticketPreviewLines(input);

  it('keeps every line within the 48 printer columns', () => {
    for (const line of lines) assert.ok(line.length <= COLUMNS, `${line.length} > 48: "${line}"`);
  });

  it('carries the OP number, the token and the fee paid with its method', () => {
    assert.equal(find(lines, 'OP Number'), 'OP Number      : OP-20260926-0042');
    assert.ok(lines.some((l) => l.trim() === 'G-024'));
    assert.equal(find(lines, 'Fee'), 'Fee            : Rs. 300 (PAID - UPI)');
  });

  it('lays out the header, the room line and the patient rows', () => {
    assert.equal(lines[0].trim(), "ST. MARY'S MULTI SPECIALITY HOSPITAL");
    assert.ok(lines.some((l) => l.trim() === 'OP REGISTRATION TICKET'));
    assert.ok(lines.some((l) => l.trim() === 'Room 101 - Dr. Shajin'));
    assert.equal(find(lines, 'Patient Name'), 'Patient Name   : Ramesh Kumar');
    assert.equal(find(lines, 'Patient ID'), 'Patient ID     : MHK202600003');
    assert.equal(find(lines, 'Age / Sex'), 'Age / Sex      : 45 / Male');
    assert.equal(find(lines, 'Department'), 'Department     : General Medicine');
    assert.equal(find(lines, 'Doctor'), 'Doctor         : Dr. Shajin');
    assert.equal(find(lines, 'Date & Time'), 'Date & Time    : 26 Sep 2026, 10:24 AM');
    assert.ok(lines.some((l) => l.trim() === 'Scan to follow your queue'));
    assert.ok(lines.some((l) => l.trim() === 'Please wait for your token number. Thank you!'));
  });

  it('prints the room as the hospital names it, never "Room Room"', () => {
    assert.ok(!lines.some((l) => l.includes('Room Room')));
    const shared = ticketPreviewLines({ ...input, visit: { ...visit, token: { ...token, room: 'Consultation Room' } } });
    assert.ok(shared.some((l) => l.trim() === 'Consultation Room - Dr. Shajin'));
    assert.ok(!shared.some((l) => l.includes('Room Consultation')));
  });

  it('wraps a long value under its value column', () => {
    const long = ticketPreviewLines({
      ...input,
      visit: { ...visit, doctor: { ...visit.doctor, name: 'Dr. Arun Kumar Venkataraman, MBBS, MD (General Medicine)' } },
    });
    const at = long.findIndex((l) => l.startsWith('Doctor'));
    assert.equal(long[at], 'Doctor         : Dr. Arun Kumar Venkataraman,');
    assert.equal(long[at + 1], '                 MBBS, MD (General Medicine)');
    for (const line of long) assert.ok(line.length <= COLUMNS, line);
  });

  it('splits a single word longer than the value column', () => {
    const long = ticketPreviewLines({ ...input, visit: { ...visit, patient: { ...visit.patient, name: 'X'.repeat(40) } } });
    const at = long.findIndex((l) => l.startsWith('Patient Name'));
    assert.equal(long[at], `Patient Name   : ${'X'.repeat(31)}`);
    assert.equal(long[at + 1], `${' '.repeat(17)}${'X'.repeat(9)}`);
  });

  it('prints non-ASCII text as ? (what the printer shows)', () => {
    const tamil = ticketPreviewLines({ ...input, visit: { ...visit, patient: { ...visit.patient, name: 'ரமேஷ்' } } });
    assert.equal(find(tamil, 'Patient Name'), 'Patient Name   : ?????');
  });

  it('marks a sample payment, without changing the fee line', () => {
    const sample = ticketPreviewLines({ ...input, visit: { ...visit, sample: true } });
    assert.equal(find(sample, 'Fee'), 'Fee            : Rs. 300 (PAID - UPI)');
    assert.ok(sample.some((l) => l.includes('SAMPLE')));
    assert.ok(!lines.some((l) => l.includes('SAMPLE')));
  });

  it('leaves out Age / Sex when the patient is not known', () => {
    const plain = ticketPreviewLines({ ...input, patient: undefined });
    assert.equal(find(plain, 'Age / Sex'), undefined);
  });
});

describe('buildTicket', () => {
  it('starts with init and ends with a cut', () => {
    const bytes = buildTicket(input).bytes();
    assert.deepEqual([...bytes.slice(0, 2)], [0x1b, 0x40]);
    assert.deepEqual([...bytes.slice(-4)], [0x1d, 0x56, 0x42, 0x00]);
  });

  it('cuts straight after the footer: GS V 66 feeds to the cutter itself, so no extra feed wastes paper', () => {
    const bytes = buildTicket(input).bytes();
    const footerEnd = bytes.length - 4;
    assert.equal(bytes[footerEnd - 1], 0x0a, 'the footer line ends right before the cut');
    assert.ok(!bytes.some((b, i) => b === 0x1b && bytes[i + 1] === 0x64), 'no ESC d (print and feed n lines)');
  });

  it('prints the token double size', () => {
    const text = Buffer.from(buildTicket(input).bytes()).toString('latin1');
    assert.ok(text.includes('\x1d\x21\x11G-024'), 'GS ! 0x11 right before the token');
  });

  it('prints the QR only when the token has a tracking link', () => {
    assert.ok(hasQrStore(buildTicket(input).bytes()));
    const noLink = { ...input, visit: { ...visit, token: { ...token, trackUrl: '' } } };
    assert.ok(!hasQrStore(buildTicket(noLink).bytes()));
    assert.ok(!ticketPreviewLines(noLink).some((l) => l.includes('Scan to follow your queue')));
  });

  it('carries the same text as the preview', () => {
    const text = Buffer.from(buildTicket(input).bytes()).toString('latin1');
    for (const line of ticketPreviewLines(input)) {
      if (line.includes('[QR')) continue;
      assert.ok(text.includes(line.trim()), line);
    }
  });
});

describe('a token-only slip (already has a token today)', () => {
  const slip: TicketInput = {
    hospitalName: "St. Mary's Multi Speciality Hospital",
    footer: 'Please wait for your token number. Thank you!',
    token,
    patient: { name: 'Ramesh Kumar', uhid: 'MHK202600003', age: 45, gender: 'Male' },
    when: '26 Sep 2026, 10:24 AM',
  };
  const lines = ticketPreviewLines(slip);

  it('has the token, the patient and the doctor, but no OP number and no fee line', () => {
    assert.ok(lines.some((l) => l.trim() === 'G-024'));
    assert.equal(find(lines, 'Patient Name'), 'Patient Name   : Ramesh Kumar');
    assert.equal(find(lines, 'Doctor'), 'Doctor         : Dr. Shajin');
    assert.equal(find(lines, 'Date & Time'), 'Date & Time    : 26 Sep 2026, 10:24 AM');
    assert.equal(find(lines, 'OP Number'), undefined);
    assert.equal(find(lines, 'Fee'), undefined);
    assert.ok(!lines.some((l) => l.trim() === 'OP REGISTRATION TICKET'));
    for (const line of lines) assert.ok(line.length <= COLUMNS, line);
  });

  it('still prints the tracking QR', () => {
    assert.ok(hasQrStore(buildTicket(slip).bytes()));
  });
});
