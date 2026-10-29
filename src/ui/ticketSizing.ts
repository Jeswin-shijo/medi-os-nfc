// Sizes for the ticket screen, derived from the layout (pure: Node tests run it).
// Every function returns today's tablet value on the expanded layout (1280 × 800 and up).
import type { Layout } from './layout';
import { contentWidth } from './sizing';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Width of the side column (token QR, notes, actions) on the expanded layout. */
export const SIDE_WIDTH = 480;
/** A side card narrower than this puts its QR above its text instead of beside it. */
const QR_BESIDE_MIN = 420;
/** A slip's text area narrower than this shows the facts one per row. */
const FACTS_TWO_COLUMNS_MIN = 300;
/** The OP number (about 230 dp at 24) and the time (about 215 dp at 20) need this much text width on one row. */
const TOP_ROW_MIN = 480;
/** "OP-20260926-0042" at 24 sp needs about 240 dp; narrower slips (320 dp phones) use 20. */
const OP_FULL_MIN = 240;
/** Padding the slip window puts around the paper (room for its shadow). */
export const SLIP_WINDOW_PAD = 14;

export interface TicketSizes {
  /** The side column sits under the slip (phones upright, tablets upright), slip first. */
  stacked: boolean;
  /** Width of the side column when beside the slip; the full content width when stacked. */
  sideWidth: number;
  gap: number;
  /** Side padding of the paper; the tear lines reach out by the same amount. */
  paperPadX: number;
  paperPadTop: number;
  token: { fontSize: number; lineHeight: number };
  title: { fontSize: number; lineHeight: number };
  bannerIcon: number;
  showSubtitle: boolean;
  qr: number;
  /** The QR sits above its explanation (a narrow card) rather than beside it. */
  qrColumn: boolean;
  cardPadding: number;
  factFont: number;
  factLine: number;
  factsTwoColumns: boolean;
  /** The OP number and the time side by side; false puts the time under the number. */
  topRow: boolean;
  /** Font size of the OP number. */
  opFont: number;
}

/** Slip first, then the side column: phones upright and small tablets upright (medium and taller than wide). */
export const ticketStacked = (l: Layout) => l.size === 'compact' || (l.size === 'medium' && l.height >= l.width);

export function ticketSizes(l: Layout): TicketSizes {
  const stacked = ticketStacked(l);
  const available = contentWidth(l);
  const gap = stacked ? 16 : l.size === 'expanded' ? 40 : 24;
  const sideWidth = stacked ? available : l.size === 'expanded' ? SIDE_WIDTH : clamp(Math.round(available * 0.4), 300, SIDE_WIDTH);
  const slipWidth = stacked ? available : available - sideWidth - gap;

  const paperPadX = l.size === 'compact' ? 20 : 28;
  const innerWidth = slipWidth - 2 * SLIP_WINDOW_PAD - 2 * paperPadX;

  const tokenFont =
    l.size === 'expanded' ? (l.height < 760 ? 80 : l.height >= 1000 ? 128 : 96) : l.size === 'compact' || l.short ? 72 : 88;
  const compact = l.size === 'compact';

  return {
    stacked,
    sideWidth,
    gap,
    paperPadX,
    paperPadTop: compact ? 18 : 22,
    token: { fontSize: tokenFont, lineHeight: Math.round(tokenFont * 1.125) },
    title: { fontSize: l.type.title, lineHeight: Math.round(l.type.title * 1.24) },
    bannerIcon: compact ? 44 : 52,
    showSubtitle: l.size === 'expanded' ? l.height >= 760 : !l.short,
    qr: compact ? 160 : 176,
    qrColumn: sideWidth < QR_BESIDE_MIN,
    cardPadding: compact ? 16 : 20,
    factFont: compact ? 20 : 22,
    factLine: compact ? 26 : 28,
    factsTwoColumns: innerWidth >= FACTS_TWO_COLUMNS_MIN,
    topRow: innerWidth >= TOP_ROW_MIN,
    opFont: innerWidth >= OP_FULL_MIN ? 24 : 20,
  };
}
