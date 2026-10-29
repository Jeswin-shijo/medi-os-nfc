import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { strings } from '../i18n/strings';
import { formatIndianMobile } from '../lib/phone';
import { easeOut } from '../motion/curves';
import { colors, fonts, motion, radii } from '../theme/tokens';

interface PhoneFieldProps {
  /** Up to ten digits. */
  digits: string;
}

/** The "+91" chip and a read-only number shown as ten cells (5 + 5). Each digit pops in as it is entered. */
export function PhoneField({ digits }: PhoneFieldProps) {
  const reduced = useReducedMotion();
  const entering = reduced
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : ZoomIn.duration(motion.duration.fast).easing(easeOut).withInitialValues({ transform: [{ scale: 0.4 }] });

  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={strings.find.numberLabel(formatIndianMobile(digits))}>
      <View style={styles.prefix}>
        <Text style={styles.prefixText}>{strings.find.prefix}</Text>
      </View>
      <View style={[styles.field, digits.length > 0 && styles.fieldFilled]}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[styles.cell, i === 4 && styles.groupGap]}>
            {digits[i] ? (
              <Animated.Text key={`${i}-${digits[i]}`} entering={entering} style={styles.digit}>
                {digits[i]}
              </Animated.Text>
            ) : (
              <View style={[styles.dash, i === digits.length && styles.dashNext]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'stretch' },
  prefix: { width: 96, borderRadius: radii.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  prefixText: { fontFamily: fonts.semibold, fontSize: 32, lineHeight: 40, color: colors.primaryDark },
  field: {
    flex: 1,
    height: 96,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  fieldFilled: { borderColor: colors.primary },
  cell: { width: 38, height: 56, alignItems: 'center', justifyContent: 'center' },
  groupGap: { marginRight: 20 },
  digit: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 48, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  dash: { width: 20, height: 4, borderRadius: 2, backgroundColor: colors.border },
  dashNext: { backgroundColor: colors.primary },
});
