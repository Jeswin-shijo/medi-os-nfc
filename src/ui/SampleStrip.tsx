import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect } from 'react-native-svg';
import { strings } from '../i18n/strings';
import { colors, radii, typography } from '../theme/tokens';

interface SampleStripProps {
  /** e.g. 'SAMPLE: do not pay. This QR cannot receive money.' */
  text: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Marks sample-mode screens so nobody mistakes them for real money or a real SMS:
 * a SAMPLE tag on amber caution stripes.
 */
export function SampleStrip({ text, style }: SampleStripProps) {
  return (
    <View style={[styles.strip, style]} accessibilityRole="alert" accessibilityLabel={`${strings.sample.badge}. ${text}`}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <Pattern id="sample-stripes" width={16} height={16} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <Line x1={0} y1={0} x2={0} y2={16} stroke={colors.warning} strokeWidth={6} strokeOpacity={0.14} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#sample-stripes)" />
      </Svg>
      <View style={styles.tag}>
        <Text style={styles.tagText}>{strings.sample.badge}</Text>
      </View>
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
    overflow: 'hidden',
  },
  tag: { backgroundColor: colors.warningText, borderRadius: radii.xs, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { ...typography.small, fontFamily: typography.label.fontFamily, color: colors.textOnColor, letterSpacing: 1.2 },
  text: { ...typography.caption, fontSize: 18, lineHeight: 24, color: colors.warningText, flexShrink: 1 },
});
