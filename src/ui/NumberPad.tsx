import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { strings } from '../i18n/strings';
import { PressableScale } from '../motion/Pressable';
import { colors, fonts, radii, sizes, typography } from '../theme/tokens';

type Key = { kind: 'digit'; digit: string } | { kind: 'clear' } | { kind: 'backspace' };

const ROWS: Key[][] = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
].map((row) => row.map((digit) => ({ kind: 'digit' as const, digit })));
ROWS.push([{ kind: 'clear' }, { kind: 'digit', digit: '0' }, { kind: 'backspace' }]);

interface NumberPadProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
  disabled?: boolean;
  /** Key height (dp). */
  keyHeight?: number;
  style?: StyleProp<ViewStyle>;
}

/** A phone-style keypad: 1–9, then Clear · 0 · delete. Fills the width it is given. */
export function NumberPad({ onDigit, onBackspace, onClear, disabled = false, keyHeight = sizes.numberKey, style }: NumberPadProps) {
  const press = (key: Key) => {
    if (key.kind === 'digit') onDigit(key.digit);
    else if (key.kind === 'backspace') onBackspace();
    else onClear?.();
  };

  return (
    <View style={[styles.pad, style]}>
      {ROWS.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key) => {
            const hidden = key.kind === 'clear' && !onClear;
            const label = key.kind === 'digit' ? key.digit : key.kind === 'clear' ? strings.numberPad.clear : strings.numberPad.backspace;
            if (hidden) return <View key={key.kind} style={styles.slot} />;
            return (
              <PressableScale
                key={key.kind === 'digit' ? key.digit : key.kind}
                onPress={() => press(key)}
                disabled={disabled}
                accessibilityLabel={label}
                highlight="rgba(30, 107, 255, 0.12)"
                style={[styles.slot, styles.key, key.kind !== 'digit' && styles.keyAction, { height: keyHeight }, disabled && styles.keyDisabled]}
              >
                {key.kind === 'digit' ? (
                  <Text style={styles.digit}>{key.digit}</Text>
                ) : key.kind === 'clear' ? (
                  <Text style={styles.action}>{strings.numberPad.clear}</Text>
                ) : (
                  <MaterialCommunityIcons name="backspace-outline" size={32} color={colors.textSecondary} />
                )}
              </PressableScale>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pad: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  slot: { flex: 1 },
  key: {
    borderRadius: radii.md,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.08), 0px 3px 8px rgba(15, 23, 42, 0.05)',
  },
  keyAction: { backgroundColor: colors.surfaceSunken, boxShadow: 'none' },
  keyDisabled: { opacity: 0.5 },
  digit: { fontFamily: fonts.semibold, fontSize: 34, lineHeight: 40, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  action: { ...typography.label, color: colors.textSecondary },
});
