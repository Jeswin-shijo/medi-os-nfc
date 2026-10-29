import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { Enter } from '../motion/Enter';
import { colors, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from './Button';

interface PanelAction {
  label: string;
  icon?: IconName;
  onPress: () => void;
}

interface ChoicePanelProps {
  icon: IconName;
  title: string;
  body: string;
  /** The recommended way on. */
  primary: PanelAction;
  /** The other way. */
  secondary: PanelAction;
  style?: StyleProp<ViewStyle>;
}

/** A calm "nothing found, here are your two ways on" card (no record for a number; number already registered). */
export function ChoicePanel({ icon, title, body, primary, secondary, style }: ChoicePanelProps) {
  const reduced = useReducedMotion();
  const iconIn = reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : ZoomIn.springify()
        .damping(motion.spring.pop.damping)
        .stiffness(motion.spring.pop.stiffness)
        .mass(motion.spring.pop.mass)
        .withInitialValues({ transform: [{ scale: 0.4 }] });
  return (
    <Enter style={[styles.panel, style]}>
      <View accessibilityRole="alert" accessible accessibilityLabel={`${title}. ${body}`} style={styles.copy}>
        <Animated.View entering={iconIn} style={styles.icon}>
          <MaterialCommunityIcons name={icon} size={52} color={colors.warningText} />
        </Animated.View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>{body}</Text>
      </View>
      <Enter index={2} style={styles.actions}>
        <Button label={secondary.label} variant="secondary" size="large" icon={secondary.icon} onPress={secondary.onPress} style={styles.action} />
        <Button label={primary.label} size="large" icon={primary.icon} onPress={primary.onPress} style={styles.action} />
      </Enter>
    </Enter>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  copy: { alignItems: 'center', gap: spacing.md, maxWidth: 720 },
  icon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { minWidth: 340 },
});
