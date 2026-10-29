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

/** A row tile narrower than this uses the tighter phone metrics (smaller icon and padding), so its text fits. */
export const ROW_TILE_DENSE_MAX = 440;

/**
 * Whether Welcome's Find my record and New patient tiles are dense: side by side with the card tile they
 * get 10/21 of the row (minus the 24 dp gap), which is under 440 dp on a tablet upright, a phone on its side
 * and a small tablet. A phone upright stacks them full width with the compact tile already.
 */
export function welcomeTilesDense(l: Layout): boolean {
  if (l.size === 'compact') return false;
  return ((contentWidth(l) - 24) * 10) / 21 < ROW_TILE_DENSE_MAX;
}

/** Height of one number key: tighter on a phone on its side. */
export function keyHeight(l: Layout): number {
  if (l.short) return l.touchMin;
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
