// Sizes for the staff screens, derived from the layout (pure: Node tests run it).
// Every value is today's tablet value on the expanded layout (1280 × 800 and up), except where a touch
// target is raised to the layout's minimum.
import type { Layout } from '../ui/layout';
import { contentWidth } from '../ui/sizing';

export interface StaffSizes {
  /** Phones upright: who is signed in goes under the title, not beside it. */
  stackBar: boolean;
  /** Widest the "signed in as" text grows. */
  whoMax: number;
  /** Space above and below the body (a phone on its side keeps it small). */
  bodyPadY: number;
  /** Widest the screen's content grows, and the widest a single sign-in or confirm card grows. */
  innerMax: number;
  narrowMax: number;
  cardPadding: number;
  /** Text fields, option rows and the back button: at least the layout's touch minimum. */
  controlHeight: number;
  inputFont: number;
  /** Starting width of a menu tile; a tile that cannot get it takes the whole row. */
  tileBasis: number;
  /** Options that sit side by side (printer kind, sounds) wrap when they cannot share a row at this width. */
  optionBasis: number;
}

export function staffSizes(l: Layout): StaffSizes {
  const compact = l.size === 'compact';
  return {
    stackBar: compact,
    whoMax: l.size === 'expanded' ? 320 : Math.round(l.width * 0.3),
    bodyPadY: l.short ? 16 : l.gutter,
    innerMax: 1040,
    narrowMax: 560,
    cardPadding: compact ? 16 : 24,
    controlHeight: l.touchMin,
    inputFont: l.size === 'expanded' ? 20 : l.type.body,
    tileBasis: compact ? contentWidth(l) : l.size === 'medium' ? 280 : 440,
    optionBasis: compact ? 200 : 180,
  };
}
