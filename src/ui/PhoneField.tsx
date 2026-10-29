import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { strings } from '../i18n/strings';
import { formatIndianMobile } from '../lib/phone';
import { easeOut } from '../motion/curves';
import { colors, fonts, motion, radii } from '../theme/tokens';
import { entryRowWidth, phoneMetrics } from './sizing';
import { useLayout } from './useLayout';

interface PhoneFieldProps {
  /** Up to ten digits. */
  digits: string;
}

/** The "+91" chip and a read-only number shown as ten cells (5 + 5), sized to the row it is in. Each digit pops in as it is entered. */
export function PhoneField({ digits }: PhoneFieldProps) {
  const reduced = useReducedMotion();
  // Until measured (a frame later), the width the layout expects.
  const layout = useLayout();
  const [rowWidth, setRowWidth] = useState(() => entryRowWidth(layout));
  const m = phoneMetrics(rowWidth);
  const entering = reduced
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : ZoomIn.duration(motion.duration.fast).easing(easeOut).withInitialValues({ transform: [{ scale: 0.4 }] });

  return (
    <View
      style={[styles.row, { gap: m.gap }]}
      onLayout={(e) => setRowWidth(Math.round(e.nativeEvent.layout.width))}
      accessible accessibilityRole="text" accessibilityLabel={strings.find.numberLabel(formatIndianMobile(digits))}>
      <View style={[styles.prefix, { width: m.prefixWidth }]}>
        <Text style={[styles.prefixText, { fontSize: m.prefixFont, lineHeight: m.prefixFont + 8 }]}>{strings.find.prefix}</Text>
      </View>
      <View style={[styles.field, { height: m.fieldHeight, paddingHorizontal: m.fieldPadding }, digits.length > 0 && styles.fieldFilled]}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={[styles.cell, { width: m.cellWidth, height: m.cellHeight }, i === 4 && { marginRight: m.groupGap }]}>
            {digits[i] ? (
              <Animated.Text key={`${i}-${digits[i]}`} entering={entering} style={[styles.digit, { fontSize: m.digitFont, lineHeight: m.digitFont + 8 }]}>
                {digits[i]}
              </Animated.Text>
            ) : (
              <View style={[styles.dash, { width: m.dashWidth }, i === digits.length && styles.dashNext]} />
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'stretch' },
  prefix: { borderRadius: radii.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  prefixText: { fontFamily: fonts.semibold, color: colors.primaryDark },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  fieldFilled: { borderColor: colors.primary },
  cell: { alignItems: 'center', justifyContent: 'center' },
  digit: { fontFamily: fonts.semibold, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  dash: { height: 4, borderRadius: 2, backgroundColor: colors.border },
  dashNext: { backgroundColor: colors.primary },
});
