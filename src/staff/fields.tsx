import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fonts, radii, spacing, typography } from '../theme/tokens';
import { useLayout } from '../ui/useLayout';
import { staffSizes } from './staffSizing';
import { useStaffSession } from './useStaffSession';

/** A labelled text field for staff screens; typing keeps the staff session alive. */
export function StaffField({ label, onChangeText, ...rest }: TextInputProps & { label: string }) {
  const touch = useStaffSession((s) => s.touch);
  const { controlHeight, inputFont } = staffSizes(useLayout());
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        // Staff credentials are never offered to, or saved by, Android's autofill.
        importantForAutofill="no"
        autoComplete="off"
        textContentType="none"
        {...rest}
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        onChangeText={(text) => {
          touch();
          onChangeText?.(text);
        }}
        style={[styles.input, { height: controlHeight, fontSize: inputFont }]}
      />
    </View>
  );
}

export function Notice({ tone, children }: { tone: 'error' | 'ok' | 'info'; children: string }) {
  return (
    <View style={[styles.notice, tone === 'error' ? styles.err : tone === 'ok' ? styles.ok : styles.info]} accessibilityRole={tone === 'error' ? 'alert' : undefined}>
      <Text style={[styles.noticeText, { color: tone === 'error' ? colors.dangerStrong : tone === 'ok' ? colors.success : colors.navy }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { ...typography.caption, color: colors.textSecondary, fontFamily: fonts.semibold },
  input: {
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  notice: { borderRadius: radii.sm, padding: spacing.md },
  err: { backgroundColor: colors.dangerLight },
  ok: { backgroundColor: colors.accentLight },
  info: { backgroundColor: colors.primaryLight },
  noticeText: { ...typography.label },
});
