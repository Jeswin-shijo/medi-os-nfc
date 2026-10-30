// Sizes for the selection and payment screens, derived from the layout (pure: Node tests run it).
// Every function returns today's tablet value on the expanded layout (1280 × 800 and up).
import type { Layout } from './layout';
import { contentWidth, sideBySide } from './sizing';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Header, step tracker and the screen's own padding: what a payment screen's content must leave free. */
const CHROME_SLACK = 94;
export const chromeHeight = (l: Layout) => l.headerHeight + l.stepperHeight + CHROME_SLACK;

/** Width of one card in a wrapping grid. */
export const gridItemWidth = (available: number, columns: number, gap: number) =>
  Math.max(0, Math.floor((available - gap * (columns - 1)) / columns));

export const gridGap = (l: Layout) => (l.size === 'compact' ? 12 : 24);

/** Width between the gutters and the safe-area insets. */
export const gridWidth = (l: Layout, insetLeft = 0, insetRight = 0) =>
  Math.max(0, Math.min(l.width, l.contentMax) - 2 * l.gutter - insetLeft - insetRight);

/** Department tile and doctor skeleton heights. */
export const departmentTileHeight = (l: Layout) => (l.size === 'expanded' ? 188 : l.size === 'compact' || l.short ? 150 : 168);
export const doctorSkeletonHeight = (l: Layout) => (l.size === 'expanded' ? 214 : l.size === 'compact' ? 168 : 190);

export function departmentBadge(l: Layout): { box: number; icon: number; radius: number } {
  return l.size === 'compact' ? { box: 64, icon: 36, radius: 18 } : { box: 84, icon: 46, radius: 24 };
}

export interface DoctorCardMetrics {
  /** The card is too narrow for the select button beside the facts: it goes under them, full width. */
  narrow: boolean;
  avatar: number;
  padding: number;
  feeFont: number;
  feeLine: number;
}

/** Doctor card sizes by the card's own width (588 at 1280, 450 on the big tablet: both keep the tablet look). */
export function doctorCardMetrics(cardWidth: number): DoctorCardMetrics {
  const narrow = cardWidth < 420;
  return {
    narrow,
    avatar: narrow ? 64 : 88,
    padding: narrow ? 18 : 24,
    feeFont: narrow ? 26 : 30,
    feeLine: narrow ? 32 : 38,
  };
}

/** Headline sizes for the payment screens (48 on a tablet). */
export function heroType(l: Layout): { fontSize: number; lineHeight: number } {
  const fontSize = l.size === 'compact' ? 32 : l.size === 'medium' ? 40 : 48;
  return { fontSize, lineHeight: Math.round(fontSize * 1.2) };
}

/** Running text of the payment screens (22 on a tablet). */
export function copyType(l: Layout): { fontSize: number; lineHeight: number } {
  const fontSize = l.size === 'expanded' ? 22 : l.type.body;
  return { fontSize, lineHeight: Math.round(fontSize * 1.36) };
}

export interface UpiSizes {
  /** The ring and the side column sit one above the other. */
  stacked: boolean;
  ring: number;
  stroke: number;
  /** QR edge; its corners stay inside the ring. */
  qr: number;
  /**
   * The ring sits at the top beside the steps instead of centred on them: on a phone on its side it is
   * taller than the room under the header, and centred on the taller steps column its QR started half
   * below the fold. At the top the whole QR shows; only the ring's lower edge needs a scroll.
   */
  alignTop: boolean;
}

/** Smallest QR edge (dp) that still scans comfortably; only a very narrow window goes below it, never under 200. */
export const QR_MIN = 220;
export const QR_MAX = 360;
const QR_HARD_MIN = 200;

/**
 * The ring around the UPI QR. Expanded: as tall as the window allows (380–620), as before.
 * Otherwise the QR is half the window's short side, 220–360 (narrower windows shrink it to fit), and the
 * ring is just big enough to hold its corners.
 */
export function upiSizes(l: Layout): UpiSizes {
  const stacked = !sideBySide(l);
  if (l.size === 'expanded') {
    const stroke = 12;
    const ring = Math.round(clamp(l.height - chromeHeight(l), 380, 620));
    return { stacked, ring, stroke, qr: Math.floor((ring - 2 * stroke - 8) / Math.SQRT2), alignTop: false };
  }
  const stroke = l.size === 'compact' ? 8 : 12;
  // The ring may reach into the gutters when stacked (up to the window minus 8 dp each side), so any window of
  // 350 dp or more keeps a 220 QR; the corner clearance is 4 dp there.
  const slack = stacked ? 4 : 8;
  const share = stacked ? l.width - 16 : (contentWidth(l) - 32) / 2;
  const widthCap = Math.floor((share - 2 * stroke - slack) / Math.SQRT2);
  const wanted = clamp(Math.round(Math.min(l.width, l.height) / 2), QR_MIN, QR_MAX);
  const qr = Math.max(QR_HARD_MIN, Math.min(wanted, widthCap));
  return { stacked, ring: Math.ceil(qr * Math.SQRT2) + 2 * stroke + slack, stroke, qr, alignTop: !stacked && l.short };
}

export interface CashSizes {
  codeFont: number;
  codeLine: number;
  codeSpacing: number;
  codePaddingX: number;
  cardPadding: number;
}

/** The cash code (140 on a tablet): shrinks so `length` digits and their spacing fit the card. */
export function cashSizes(l: Layout, length: number): CashSizes {
  const cardPadding = l.size === 'compact' ? 16 : 24;
  const codePaddingX = l.size === 'compact' ? 20 : l.size === 'medium' ? 40 : 64;
  const room = contentWidth(l) - 2 * cardPadding - 2 * codePaddingX - 4;
  // A digit is about 0.62 em wide, with 0.114 em of spacing after it.
  const fit = Math.floor(room / (Math.max(1, length) * 0.734));
  const codeFont = clamp(fit, 48, l.short ? 96 : 140);
  return { codeFont, codeLine: Math.round(codeFont * 1.114), codeSpacing: Math.round(codeFont * 0.114), codePaddingX, cardPadding };
}

/** The card machine drawing is laid out at 440 × 520; this scale fits it to the space it gets. */
export const MACHINE_BOX = { width: 440, height: 520 } as const;

export function machineScale(l: Layout): { stacked: boolean; scale: number } {
  const stacked = !sideBySide(l);
  const availW = stacked ? contentWidth(l) : (contentWidth(l) - 40) * 0.45;
  const availH = stacked ? l.height * 0.36 : l.height - chromeHeight(l);
  const scale = Math.min(1, clamp(Math.min(availW / MACHINE_BOX.width, availH / MACHINE_BOX.height), 0.5, 1));
  return { stacked, scale: Math.round(scale * 100) / 100 };
}

/** The check mark on the Paid screen (280 on a tablet) and whether its details sit beside it. */
export function paidSizes(l: Layout): { stacked: boolean; check: number; rowHeight: number; valueFont: number } {
  const stacked = !sideBySide(l);
  const check = l.size === 'expanded' ? 280 : l.short ? 160 : l.size === 'compact' ? 200 : 240;
  return { stacked, check, rowHeight: l.size === 'compact' ? 60 : 68, valueFont: l.size === 'compact' ? 20 : 24 };
}

/** How the payment-method tiles are laid out: how many per row, and whether they are rows (icon left) or columns. */
export function methodTiles(l: Layout, count: number): { perRow: number; orientation: 'row' | 'column'; fillHeight: boolean } {
  const perRow = l.short ? Math.min(count, 3) : Math.max(1, Math.min(count, l.columns('tiles')));
  return { perRow, orientation: l.size === 'compact' && !l.short ? 'row' : 'column', fillHeight: l.size === 'expanded' };
}
