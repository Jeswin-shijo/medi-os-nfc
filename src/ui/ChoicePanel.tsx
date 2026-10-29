import { MaterialCommunityIcons } from '@expo/vector-icons';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { Enter } from '../motion/Enter';
import { colors, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from './Button';
import { contentWidth, fit } from './sizing';
import { useLayout } from './useLayout';

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
  const layout = useLayout();
  const compact = layout.size === 'compact';
  // Side by side when two 340 buttons fit; stacked (full width, the main one first) when they do not.
  const stacked = contentWidth(layout) < 2 * 340 + spacing.md + 2 * spacing.xl;
  const actionWidth = stacked ? contentWidth(layout) - 2 * (compact ? spacing.md : spacing.xl) : fit(340, (contentWidth(layout) - spacing.md - 2 * spacing.xl) / 2);
  const iconBox = compact || layout.short ? 76 : 104;
  const iconIn = reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : ZoomIn.springify()
        .damping(motion.spring.pop.damping)
        .stiffness(motion.spring.pop.stiffness)
        .mass(motion.spring.pop.mass)
        .withInitialValues({ transform: [{ scale: 0.4 }] });
  const secondaryButton = (
    <Button label={secondary.label} variant="secondary" size="large" icon={secondary.icon} onPress={secondary.onPress} style={{ minWidth: actionWidth }} />
  );
  const primaryButton = <Button label={primary.label} size="large" icon={primary.icon} onPress={primary.onPress} style={{ minWidth: actionWidth }} />;
  return (
    <Enter style={[styles.panel, compact && styles.panelCompact, layout.short && styles.panelShort, style]}>
      <View accessibilityRole="alert" accessible accessibilityLabel={`${title}. ${body}`} style={styles.copy}>
        <Animated.View entering={iconIn} style={[styles.icon, { width: iconBox, height: iconBox, borderRadius: iconBox / 2 }]}>
          <MaterialCommunityIcons name={icon} size={Math.round(iconBox / 2)} color={colors.warningText} />
        </Animated.View>
        <Text style={[styles.title, { fontSize: layout.type.title, lineHeight: Math.round(layout.type.title * 1.24) }]}>{title}</Text>
        <Text style={[styles.body, { fontSize: layout.type.body, lineHeight: Math.round(layout.type.body * 1.4) }]}>{body}</Text>
      </View>
      <Enter index={2} style={[styles.actions, stacked && styles.actionsStacked]}>
        {/* The recommended way sits first when stacked, so a thumb finds it without scrolling. */}
        {stacked ? primaryButton : secondaryButton}
        {stacked ? secondaryButton : primaryButton}
      </Enter>
    </Enter>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexGrow: 1,
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
  panelCompact: { gap: spacing.lg, padding: spacing.md },
  panelShort: { gap: spacing.md, padding: spacing.md },
  copy: { alignItems: 'center', gap: spacing.md, maxWidth: 720 },
  icon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: spacing.md },
  actionsStacked: { flexDirection: 'column', alignSelf: 'stretch' },
});
