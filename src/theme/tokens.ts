// The kiosk's design tokens: MediOS blue on a calm light surface, IBM Plex Sans, big touch targets.
// Pure data (no react-native imports) so plain-Node code can read it too.

export const colors = {
  primary: '#1E6BFF',
  primaryDark: '#0E50D6',
  primaryLight: '#EBF2FF',
  /** Pressed / selected wash on light surfaces. */
  primaryWash: '#D6E4FF',
  navy: '#0F172A',
  accent: '#10B981',
  accentLight: '#E8FDF3',
  /** Green that carries white text and icons (4.5:1). */
  success: '#047857',
  /** Green for large graphics such as the payment check (3:1 against white). */
  successBright: '#059669',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningBorder: '#FCD34D',
  /** Amber text on warningLight (7:1). */
  warningText: '#92400E',
  danger: '#EF4444',
  /** Red text and borders on white (4.8:1). */
  dangerStrong: '#DC2626',
  dangerLight: '#FEE2E2',
  purple: '#7C3AED',
  purpleLight: '#F1EAFE',
  background: '#F8FAFC',
  /** Second neutral layer: wells, number-pad keys, skeletons. */
  surfaceSunken: '#F1F5F9',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  /** Smallest text that still reads (4.7:1 on white). */
  textTertiary: '#64748B',
  /** Decorative only (icons in disabled controls, placeholder strokes): below text contrast. */
  textMuted: '#94A3B8',
  textOnColor: '#FFFFFF',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
  scrim: 'rgba(15, 23, 42, 0.56)',
} as const;

/** The blue header band: deep on the left where the hospital name sits, brighter to the right. */
export const headerGradient = ['#0B44BE', '#1559E8', '#1E6BFF'] as const;
/** Secondary text on the header band (5.4:1 on its darker half). */
export const headerSubtle = '#DCE8FF';

/** Payment method tiles, as in the hospital's workflow images. Each carries white text. */
export const methodColors = {
  UPI: '#0A8754',
  CASH: '#1E6BFF',
  CARD: '#7C3AED',
} as const;

export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
} as const;

/**
 * Type scale (sp) at tablet size: titles 34, body 20 (compact screens use `useLayout().type`); the token number is the one display size.
 * Line heights are explicit so rolling digits and boxes line up.
 */
export const typography = {
  display: { fontFamily: fonts.bold, fontSize: 96, lineHeight: 108, letterSpacing: -1.5 },
  hero: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 58, letterSpacing: -0.8 },
  title: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, letterSpacing: -0.4 },
  headline: { fontFamily: fonts.semibold, fontSize: 26, lineHeight: 34, letterSpacing: -0.2 },
  bodyLarge: { fontFamily: fonts.regular, fontSize: 22, lineHeight: 30 },
  body: { fontFamily: fonts.regular, fontSize: 20, lineHeight: 28 },
  button: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  label: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24 },
  caption: { fontFamily: fonts.medium, fontSize: 16, lineHeight: 22 },
  small: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 18, letterSpacing: 0.2 },
} as const;

export const radii = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, pill: 999 } as const;

export const spacing = { xxs: 2, xs: 4, sm: 8, md: 16, lg: 24, xl: 40, xxl: 56 } as const;

/**
 * Touch targets (dp) and gutters at tablet (expanded) size. The brief's floor is 64 for buttons;
 * number keys and tiles go larger. Phones and small tablets scale these down: read the size-aware
 * values (gutter, touchMin, type, header and tracker heights) from `useLayout()` (src/ui/layout.ts).
 */
export const sizes = {
  touchMin: 64,
  buttonLarge: 76,
  numberKey: 80,
  headerHeight: 96,
  stepperHeight: 60,
  screenGutter: 40,
} as const;

/** Soft, offset shadows (RN `boxShadow`): resting cards, lifted (pressed or selected) cards, dialogs. */
export const shadows = {
  card: '0px 1px 2px rgba(15, 23, 42, 0.06), 0px 8px 24px rgba(15, 23, 42, 0.07)',
  lifted: '0px 2px 6px rgba(15, 23, 42, 0.08), 0px 18px 40px rgba(15, 23, 42, 0.14)',
  dialog: '0px 24px 64px rgba(15, 23, 42, 0.30)',
  primaryButton: '0px 6px 16px rgba(14, 80, 214, 0.28)',
} as const;

/**
 * Motion: everyday 150–300 ms, celebrations up to 900 ms. Easing is a cubic-bezier
 * (exponential ease-out) read by the motion kit; springs are critically damped-ish (no wobble).
 */
export const motion = {
  duration: { fast: 150, base: 220, slow: 300, celebrate: 900 },
  easeOut: [0.16, 1, 0.3, 1] as const,
  /** Delay between siblings entering one after another, and the cap on how many are staggered. */
  stagger: 40,
  staggerMax: 8,
  rise: 12,
  pressScale: 0.97,
  spring: {
    press: { damping: 22, stiffness: 520, mass: 0.6 },
    pop: { damping: 14, stiffness: 240, mass: 0.8 },
    settle: { damping: 20, stiffness: 180, mass: 1 },
  },
} as const;
