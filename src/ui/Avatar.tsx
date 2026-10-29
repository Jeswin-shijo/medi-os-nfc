import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme/tokens';

const TITLES = /^(dr|mr|mrs|ms|miss|prof|master|baby)\.?$/i;

/** 'Dr. Arun Kumar' → 'AK', 'ssss' → 'S'. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w && !TITLES.test(w));
  if (!words.length) return '?';
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : '';
  return (first + last).toUpperCase();
}

// Soft tint with a deep ink of the same hue (≥ 4.5:1), picked by name so a person keeps their colour.
const TINTS: [string, string][] = [
  [colors.primaryLight, colors.primaryDark],
  [colors.accentLight, colors.success],
  [colors.purpleLight, '#6D28D9'],
  [colors.warningLight, colors.warningText],
  ['#FFE4E6', '#BE123C'],
  ['#CCFBF1', '#0F766E'],
];

function tintFor(name: string): [string, string] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length]!;
}

interface AvatarProps {
  name: string;
  size?: number;
}

/** Initials in a tinted circle with a white rim: patients and doctors have no photos here. */
export function Avatar({ name, size = 72 }: AvatarProps) {
  const [bg, ink] = tintFor(name);
  return (
    <View
      style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg, borderWidth: Math.max(2, size / 24) }]}
      importantForAccessibility="no-hide-descendants"
    >
      <Text style={{ fontFamily: fonts.semibold, fontSize: size * 0.38, lineHeight: size * 0.48, color: ink }} allowFontScaling={false}>
        {initials(name)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.card,
    boxShadow: '0px 2px 6px rgba(15, 23, 42, 0.10)',
  },
});
