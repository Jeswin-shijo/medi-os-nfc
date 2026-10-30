// Sizes for the identification screens, derived from the window (pure: Node tests run it).
import type { Layout } from './layout';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** `Math.min(max, available)`: a size that keeps its tablet value where there is room and shrinks where there is not. */
export const fit = (max: number, available: number) => Math.max(0, Math.min(max, available));

/** Width between the side gutters, up to the widest the content grows. */
export const contentWidth = (l: Layout) => Math.max(0, Math.min(l.width, l.contentMax) - 2 * l.gutter);

/** Content at least this wide (dp) puts the number display and the pad side by side; narrower stacks them. */
export const SIDE_BY_SIDE_MIN = 760;
export const sideBySide = (l: Layout) => contentWidth(l) >= SIDE_BY_SIDE_MIN;

/** The number pad: 460 on a tablet; full width up to 420 when stacked; about 40% of the row beside the display on a phone on its side. */
export function padWidth(l: Layout): number {
  const available = contentWidth(l);
  if (!sideBySide(l)) return fit(420, available);
  return l.size === 'expanded' ? 460 : fit(380, Math.round(available * 0.42));
}

/** Content narrower than this stacks Welcome's tiles (card first, full width): a phone upright, a small tablet upright. */
export const WELCOME_SIDE_BY_SIDE_MIN = 640;
export const welcomeStacked = (l: Layout) => l.size === 'compact' || contentWidth(l) < WELCOME_SIDE_BY_SIDE_MIN;

/** A row tile narrower than this uses the tighter phone metrics (smaller icon and padding), so its text fits. */
export const ROW_TILE_DENSE_MAX = 440;

/**
 * Whether Welcome's Find my record and New patient tiles are dense: side by side with the card tile they
 * get 10/21 of the row (minus the 24 dp gap), which is under 440 dp on a tablet upright, a phone on its side
 * and a small tablet. A phone upright stacks them full width with the compact tile already.
 */
export function welcomeTilesDense(l: Layout): boolean {
  if (welcomeStacked(l)) return false;
  return ((contentWidth(l) - 24) * 10) / 21 < ROW_TILE_DENSE_MAX;
}

/** The patient card's details column needs this much width for two facts side by side ("26 Sep 2026 11:30 AM") at 26 sp, and at 20 sp. */
export const PATIENT_FACTS_TWO_MIN = 600;
export const PATIENT_FACTS_TWO_SMALL_MIN = 440;

export interface PatientFacts {
  twoColumns: boolean;
  /** The value size when two to a row in a narrower column; null keeps the screen's own size. */
  valueFont: { fontSize: number; lineHeight: number } | null;
}

/**
 * How the patient card lists its facts. The details column is what is left beside the identity block (40% of
 * the content, at most 400) and the divider, less its padding (16 on a short window, 40 otherwise). Wide
 * columns keep two to a row; a medium column (a small tablet or a phone on its side, where the height is
 * scarce) keeps two to a row in smaller type so Continue stays in sight; narrow ones list one per row.
 * A phone upright stacks the card and lists the facts one per row.
 */
export function patientFacts(l: Layout, insetX = 0): PatientFacts {
  if (l.size === 'compact') return { twoColumns: false, valueFont: null };
  const details = patientDetailsWidth(l, insetX);
  if (details >= PATIENT_FACTS_TWO_MIN) return { twoColumns: true, valueFont: null };
  if (details >= PATIENT_FACTS_TWO_SMALL_MIN) return { twoColumns: true, valueFont: { fontSize: 20, lineHeight: 26 } };
  return { twoColumns: false, valueFont: null };
}

/** The patient card's content width, less the safe-area insets at the sides (a phone's camera cutout on its side). */
export const patientContentWidth = (l: Layout, insetX = 0) => Math.max(0, contentWidth(l) - insetX);

function patientDetailsWidth(l: Layout, insetX: number): number {
  const available = patientContentWidth(l, insetX);
  const identity = fit(400, Math.round(available * 0.4));
  const padding = l.short ? 16 : 40;
  return available - identity - 1 - 2 * padding;
}

/** The fact value's size on the screen (typography.headline), when the layout keeps it. */
const FACT_FONT = 26;
/** Space after a fact in a half row (its right padding, spacing.lg). */
const FACT_GAP = 24;
/** IBM Plex Sans Medium advances about 0.53 em a character ("26 Sep 2026 08:20 AM" is 210 dp at 20 sp); a little more for safety. */
const FACT_CHAR_EM = 0.56;
/** A long value shrinks no further than this before it takes a row of its own. */
export const FACT_MIN_FONT = 16;

/** The stacked card's details padding on a phone upright (spacing.md). */
const COMPACT_DETAILS_PADDING = 16;

/**
 * How one fact's value fits its row so it is never cut off. Two to a row: as it is, a little smaller (the
 * last visit's date and time on a phone on its side), or alone on its row at the column's size when even
 * 16 sp would cut it off. One to a row: as it is, or a little smaller where the row is narrower than the
 * value (a small tablet upright, 640 dp, cut "26 Sep 2026 11:30 AM" at 26 sp).
 */
export function factFit(l: Layout, value: string, insetX = 0): { fullRow: boolean; fontSize: number | null } {
  const { twoColumns, valueFont } = patientFacts(l, insetX);
  const compact = l.size === 'compact';
  // The value sizes Patient uses: the two-to-a-row size, a phone's size, or the screen's own.
  const size = valueFont?.fontSize ?? (compact ? l.type.subtitle + 2 : FACT_FONT);
  const details = compact ? patientContentWidth(l, insetX) - 2 * COMPACT_DETAILS_PADDING : patientDetailsWidth(l, insetX);
  const room = (twoColumns ? Math.floor(details / 2) : details) - FACT_GAP;
  const widthAt = (font: number) => value.length * font * FACT_CHAR_EM;
  if (widthAt(size) <= room) return { fullRow: !twoColumns, fontSize: null };
  const shrunk = Math.floor(room / (value.length * FACT_CHAR_EM));
  if (shrunk >= FACT_MIN_FONT) return { fullRow: !twoColumns, fontSize: Math.min(size - 1, shrunk) };
  // Too long even at 16 sp: two to a row gives it the row; one to a row, the smallest size (the rest ellipsised).
  return twoColumns ? { fullRow: true, fontSize: null } : { fullRow: true, fontSize: FACT_MIN_FONT };
}

/** Expanded windows lower than this (a small tablet on its side) use the touch minimum for number keys. */
export const SMALL_TABLET_MAX_HEIGHT = 720;

/** Height of one number key: tighter on a phone on its side. */
export function keyHeight(l: Layout): number {
  if (l.short) return l.touchMin;
  // A small tablet on its side (1024 x 640): 80 dp keys pushed the last row below the fold; 64 is the tablet minimum.
  if (l.size === 'expanded' && l.height < SMALL_TABLET_MAX_HEIGHT) return l.touchMin;
  return l.size === 'compact' ? 60 : l.size === 'medium' ? 72 : 80;
}

/** Best guess at the width of a number or code row before it is measured, so a phone never paints a tablet-sized row. */
export function entryRowWidth(l: Layout): number {
  const available = contentWidth(l);
  const panelPadding = l.size === 'compact' ? 16 : 24;
  const panel = sideBySide(l) ? available - padWidth(l) - 40 : available;
  return Math.max(0, panel - 2 * panelPadding);
}

export interface PhoneMetrics {
  prefixWidth: number;
  prefixFont: number;
  gap: number;
  fieldHeight: number;
  fieldPadding: number;
  cellWidth: number;
  cellHeight: number;
  groupGap: number;
  digitFont: number;
  dashWidth: number;
}

/** The "+91" chip and ten digit cells, sized to the width of the row they sit in (tablet values from about 600 dp up). */
export function phoneMetrics(rowWidth: number): PhoneMetrics {
  const prefixWidth = clamp(Math.round(rowWidth * 0.17), 64, 96);
  const gap = rowWidth < 420 ? 8 : 12;
  const fieldPadding = rowWidth < 420 ? 8 : 12;
  const fieldWidth = rowWidth - prefixWidth - gap;
  const groupGap = fieldWidth >= 480 ? 20 : 10;
  const inner = fieldWidth - 2 * fieldPadding - 4;
  const cellWidth = clamp(Math.floor((inner - groupGap) / 10), 16, 38);
  return {
    prefixWidth,
    prefixFont: clamp(Math.round(prefixWidth * 0.33), 22, 32),
    gap,
    fieldHeight: clamp(Math.round((cellWidth * 96) / 38), 64, 96),
    fieldPadding,
    cellWidth,
    cellHeight: Math.round(cellWidth * (56 / 38)),
    groupGap,
    digitFont: clamp(Math.round(cellWidth * 1.05), 22, 40),
    dashWidth: Math.round(cellWidth * 0.53),
  };
}

export interface OtpMetrics {
  gap: number;
  boxWidth: number;
  boxHeight: number;
  digitFont: number;
}

/** The code boxes, sized to the width of the row they sit in (72 × 88 with 14 between from about 560 dp up). */
export function otpMetrics(rowWidth: number, length = 6): OtpMetrics {
  const gap = rowWidth < 400 ? 8 : 14;
  const boxWidth = clamp(Math.floor((rowWidth - (length - 1) * gap) / length), 40, 72);
  return {
    gap,
    boxWidth,
    boxHeight: Math.round((boxWidth * 88) / 72),
    digitFont: clamp(Math.round(boxWidth * 0.55), 24, 40),
  };
}
