import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { colors, radii, typography } from '../theme/tokens';

interface StepTitleProps {
  title: string;
  subtitle?: string;
  /** Position inside the current part of the flow, shown as 'Step 2 of 5'. */
  step?: { current: number; total: number };
  style?: StyleProp<ViewStyle>;
}

/** The screen's one heading (34), a friendly line under it (20), and where the patient is. */
export function StepTitle({ title, subtitle, step, style }: StepTitleProps) {
  return (
    <View style={[styles.row, style]}>
      <View style={styles.text}>
        <Enter>
          <Text style={styles.title} accessibilityRole="header">
            {title}
          </Text>
        </Enter>
        {subtitle ? (
          <Enter index={1}>
            <Text style={styles.subtitle}>{subtitle}</Text>
          </Enter>
        ) : null}
      </View>
      {step ? (
        <Enter index={2}>
          <View style={styles.pill}>
            <Text style={styles.pillText}>{strings.stepOf(step.current, step.total)}</Text>
          </View>
        </Enter>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 24 },
  text: { flex: 1, gap: 6 },
  title: { ...typography.title, color: colors.textPrimary },
  subtitle: { ...typography.body, color: colors.textSecondary },
  pill: { marginTop: 6, backgroundColor: colors.primaryLight, borderRadius: radii.pill, paddingHorizontal: 16, paddingVertical: 8 },
  pillText: { ...typography.caption, color: colors.primaryDark, fontVariant: ['tabular-nums'] },
});
