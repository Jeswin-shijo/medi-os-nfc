// Responsive layout rules for phones and tablets in either orientation.
// Pure (no react-native imports) so plain-Node tests can run it; `useLayout` feeds it the window size.

export type SizeClass = 'compact' | 'medium' | 'expanded';

export type ColumnKind = 'department' | 'doctor' | 'tiles';

export interface Layout {
  size: SizeClass;
  /** Window height under 600 dp (a phone on its side): screens tighten their vertical spacing. */
  short: boolean;
  width: number;
  height: number;
  /** Side padding of the header, tracker and screens. */
  gutter: number;
  /** Widest the content grows on very large screens; narrower screens use their whole width. */
  contentMax: number;
  /** Smallest touch target. */
  touchMin: number;
  /** Height of the blue band (without the status-bar inset) and of the step tracker below it. */
  headerHeight: number;
  stepperHeight: number;
  type: { title: number; subtitle: number; body: number; label: number };
  /** How many cards sit side by side for a kind of grid. */
  columns(kind: ColumnKind): number;
}

/** Window widths (dp): compact below 600, medium 600–999, expanded 1000 and up. */
export const MEDIUM_MIN_WIDTH = 600;
export const EXPANDED_MIN_WIDTH = 1000;
/** Windows this wide get one more column in the department and doctor grids. */
export const WIDE_MIN_WIDTH = 1600;
/** Windows under this height count as short. */
export const SHORT_MAX_HEIGHT = 600;

const GUTTER = { compact: 16, medium: 32, expanded: 40 } as const;
const HEADER = { compact: 64, medium: 80, expanded: 96 } as const;
const STEPPER = { compact: 48, medium: 56, expanded: 60 } as const;
/** Phones in either orientation (compact, or short on its side) use the phone minimum of 56. */
const TOUCH_MIN = { compact: 56, medium: 64, expanded: 64 } as const;
const PHONE_TOUCH_MIN = 56;
const TYPE = {
  compact: { title: 26, subtitle: 18, body: 18, label: 16 },
  medium: { title: 30, subtitle: 20, body: 19, label: 17 },
  expanded: { title: 34, subtitle: 22, body: 20, label: 18 },
} as const;
const COLUMNS: Record<ColumnKind, readonly [number, number, number]> = {
  department: [2, 3, 3],
  doctor: [1, 2, 2],
  tiles: [1, 2, 3],
};
const CONTENT_MAX_EXPANDED = 1480;

/**
 * A box's share of a row's free space, like `flex: grow`, for rows that a rotation can turn into columns
 * (and back). `flex` gives a numeric flex basis, and React Native's Yoga keeps a box's first computed basis
 * when its style changes: a box that sat in a column before the device turned keeps its old height as its
 * basis in the row and runs off the screen. A zero width is a basis Yoga recomputes on every layout.
 * Only for boxes whose parent is a row.
 */
export function rowShare(grow = 1) {
  return { flexGrow: grow, flexShrink: 1, width: 0 } as const;
}

/** Windows narrower than this show only the time in the header: the date squeezed the hospital name to "...". */
export const HEADER_DATE_MIN_WIDTH = 900;
export const headerTimeOnly = (l: Layout) => l.width < HEADER_DATE_MIN_WIDTH;

export function sizeClassFor(width: number): SizeClass {
  if (width < MEDIUM_MIN_WIDTH) return 'compact';
  return width < EXPANDED_MIN_WIDTH ? 'medium' : 'expanded';
}

export function layoutFor(width: number, height: number): Layout {
  const size = sizeClassFor(width);
  const short = height < SHORT_MAX_HEIGHT;
  const index = size === 'compact' ? 0 : size === 'medium' ? 1 : 2;
  return {
    size,
    short,
    width,
    height,
    gutter: GUTTER[size],
    contentMax: size === 'expanded' ? CONTENT_MAX_EXPANDED : width,
    touchMin: short || size === 'compact' ? PHONE_TOUCH_MIN : TOUCH_MIN[size],
    // A phone on its side has little height to give away.
    headerHeight: short ? Math.min(HEADER[size], HEADER.compact) : HEADER[size],
    stepperHeight: short ? Math.min(STEPPER[size], STEPPER.compact) : STEPPER[size],
    type: TYPE[size],
    columns(kind) {
      const base = COLUMNS[kind][index];
      // Department 3 -> 4 and doctor 2 -> 3 on the big tablet.
      return size === 'expanded' && width >= WIDE_MIN_WIDTH && kind !== 'tiles' ? base + 1 : base;
    },
  };
}
