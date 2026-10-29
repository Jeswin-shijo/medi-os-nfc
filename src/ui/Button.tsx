import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';
import { PressableScale } from '../motion/Pressable';
import { colors, radii, shadows, sizes, typography } from '../theme/tokens';

export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type Variant = 'primary' | 'success' | 'secondary' | 'quiet';

interface ButtonProps {
  label: string;
  onPress?: () => void;
  /** primary: the one main action; success: go ahead after a check (Continue); secondary: the alternative; quiet: a text action. */
  variant?: Variant;
  size?: 'regular' | 'large';
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  disabled?: boolean;
  /** Shows a spinner and ignores presses; the label stays so the button keeps its size. */
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const LOOK: Record<Variant, { box: ViewStyle; text: string; wash: string }> = {
  primary: { box: { backgroundColor: colors.primary, boxShadow: shadows.primaryButton }, text: colors.textOnColor, wash: 'rgba(15, 23, 42, 0.16)' },
  success: { box: { backgroundColor: colors.success, boxShadow: '0px 6px 16px rgba(4, 120, 87, 0.26)' }, text: colors.textOnColor, wash: 'rgba(15, 23, 42, 0.16)' },
  secondary: { box: { backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.borderDark }, text: colors.primaryDark, wash: 'rgba(30, 107, 255, 0.08)' },
  quiet: { box: { backgroundColor: 'transparent' }, text: colors.primaryDark, wash: 'rgba(30, 107, 255, 0.08)' },
};

/** A big, labelled action (64 dp tall, 76 for the large size). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  icon,
  iconPosition = 'start',
  disabled = false,
  loading = false,
  style,
  accessibilityLabel,
}: ButtonProps) {
  const look = LOOK[variant];
  const off = disabled && !loading;
  const textColor = off ? colors.textTertiary : look.text;
  const large = size === 'large';
  const iconNode = loading ? (
    <ActivityIndicator color={textColor} size={large ? 28 : 24} />
  ) : icon ? (
    <MaterialCommunityIcons name={icon} size={large ? 30 : 26} color={textColor} />
  ) : null;

  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled || loading}
      highlight={look.wash}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ busy: loading }}
      style={[
        styles.base,
        large ? styles.large : styles.regular,
        look.box,
        off && styles.disabled,
        off && variant === 'quiet' && styles.disabledQuiet,
        style,
      ]}
    >
      {iconPosition === 'start' ? iconNode : null}
      {/* A long label on a phone takes a second line rather than being cut short (adjustsFontSizeToFit stayed tiny after a rotation). */}
      <Text style={[styles.label, large && styles.labelLarge, { color: textColor }]} numberOfLines={2}>
        {label}
      </Text>
      {iconPosition === 'end' ? iconNode : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, borderRadius: radii.md },
  regular: { minHeight: sizes.touchMin, paddingHorizontal: 28 },
  large: { minHeight: sizes.buttonLarge, paddingHorizontal: 40, borderRadius: radii.lg - 4 },
  disabled: { backgroundColor: colors.surfaceSunken, borderColor: colors.border, boxShadow: 'none' },
  disabledQuiet: { backgroundColor: 'transparent' },
  label: { ...typography.button, flexShrink: 1, textAlign: 'center' },
  labelLarge: { fontSize: 24, lineHeight: 30 },
});
