// MediOS blue on a calm light surface. The full visual kit (motion, buttons) comes in Task 18.

export const colors = {
  primary: '#1E6BFF',
  primaryDark: '#0E50D6',
  primaryLight: '#EBF2FF',
  navy: '#0F172A',
  accent: '#10B981',
  accentLight: '#E8FDF3',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  background: '#F8FAFC',
  card: '#FFFFFF',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderDark: '#CBD5E1',
} as const;

export const fonts = {
  regular: 'IBMPlexSans_400Regular',
  medium: 'IBMPlexSans_500Medium',
  semibold: 'IBMPlexSans_600SemiBold',
  bold: 'IBMPlexSans_700Bold',
} as const;

export const radii = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 40 } as const;
