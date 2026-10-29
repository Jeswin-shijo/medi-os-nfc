import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { PressableScale } from '../motion/Pressable';
import { withAlpha } from '../theme/color';
import { colors, motion, radii, shadows, typography } from '../theme/tokens';
import type { IconName } from './Button';

interface BigTileProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  /** Custom art in place of the icon badge (the welcome card tile's ripple). */
  art?: ReactNode;
  /** Accent: the icon badge on a white tile, the whole tile when `filled`. */
  color?: string;
  /** A solid colour tile with white text (payment methods). */
  filled?: boolean;
  /** 'row': art on the left, text, chevron (welcome); 'column': art on top (departments, methods). */
  orientation?: 'row' | 'column';
  /** Lifts the tile (chosen, about to move on). */
  selected?: boolean;
  disabled?: boolean;
  /** A short tag in the corner, e.g. 'Fastest'. */
  badge?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/** A large choice: one tap picks it. White card with a tinted icon badge, or a solid colour tile. */
export function BigTile({
  title,
  subtitle,
  icon,
  art,
  color = colors.primary,
  filled = false,
  orientation = 'column',
  selected = false,
  disabled = false,
  badge,
  onPress,
  style,
  accessibilityLabel,
}: BigTileProps) {
  const reduced = useReducedMotion();
  const lift = useSharedValue(selected ? 1 : 0);
  useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, motion.spring.settle);
  }, [selected, lift]);
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + 0.02 * lift.value }] }));

  const row = orientation === 'row';
  const ink = filled ? colors.textOnColor : colors.textPrimary;
  const subInk = filled ? 'rgba(255, 255, 255, 0.88)' : colors.textSecondary;

  return (
    <Animated.View style={[style, liftStyle]}>
      <PressableScale
        onPress={onPress}
        disabled={disabled}
        highlight={filled ? 'rgba(15, 23, 42, 0.14)' : withAlpha(color, 0.07)}
        accessibilityLabel={accessibilityLabel ?? [title, subtitle].filter(Boolean).join(', ')}
        accessibilityState={{ selected }}
        style={[
          styles.tile,
          row ? styles.row : styles.column,
          filled ? { backgroundColor: color } : styles.surface,
          selected && { borderColor: color, borderWidth: 2, boxShadow: shadows.lifted },
          disabled && styles.disabled,
        ]}
      >
        {art ?? (icon ? <IconBadge icon={icon} color={color} filled={filled} large={!row} /> : null)}
        <View style={[styles.text, row ? styles.textRow : styles.textColumn]}>
          <Text style={[styles.title, { color: ink }, !row && styles.centred]} numberOfLines={2}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: subInk }, !row && styles.centred]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        {row ? <MaterialCommunityIcons name="chevron-right" size={36} color={filled ? ink : colors.textTertiary} /> : null}
        {badge ? (
          <View style={[styles.badge, { backgroundColor: filled ? 'rgba(255, 255, 255, 0.22)' : withAlpha(color, 0.12) }]}>
            <Text style={[styles.badgeText, { color: filled ? colors.textOnColor : color }]}>{badge}</Text>
          </View>
        ) : null}
      </PressableScale>
    </Animated.View>
  );
}

function IconBadge({ icon, color, filled, large }: { icon: IconName; color: string; filled: boolean; large: boolean }) {
  const box = large ? 80 : 72;
  return (
    <View
      style={[
        styles.iconBadge,
        { width: box, height: box, backgroundColor: filled ? 'rgba(255, 255, 255, 0.2)' : withAlpha(color, 0.12) },
      ]}
    >
      <MaterialCommunityIcons name={icon} size={large ? 44 : 38} color={filled ? colors.textOnColor : color} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Grows to fill whatever the caller gives the tile (equal-height rows in a grid).
  tile: { flexGrow: 1, borderRadius: radii.lg },
  surface: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  row: { flexDirection: 'row', alignItems: 'center', gap: 24, minHeight: 128, paddingHorizontal: 28, paddingVertical: 24 },
  column: { alignItems: 'center', justifyContent: 'center', gap: 18, minHeight: 196, paddingHorizontal: 20, paddingVertical: 28 },
  disabled: { opacity: 0.45 },
  text: { gap: 4 },
  textRow: { flex: 1 },
  textColumn: { alignSelf: 'stretch' },
  title: { ...typography.headline },
  subtitle: { ...typography.caption, fontFamily: typography.body.fontFamily, fontSize: 18, lineHeight: 24 },
  centred: { textAlign: 'center' },
  iconBadge: { borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: 14, right: 14, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 4 },
  badgeText: { ...typography.small, fontFamily: typography.label.fontFamily },
});
