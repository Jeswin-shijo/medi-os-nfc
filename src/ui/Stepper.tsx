import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { FLOW_STEPS, type FlowStep } from '../flow/steps';
import { strings } from '../i18n/strings';
import { always, easeOut } from '../motion/curves';
import { colors, fonts, motion, radii, typography } from '../theme/tokens';

const UNDERLINE_INSET = 28;

/** Identify → Doctor → Pay → Ticket. Done steps tick green; a bar glides under the current one. */
export function Stepper({ current }: { current: FlowStep }) {
  const reduced = useReducedMotion();
  const [width, setWidth] = useState(0);
  const segment = width / FLOW_STEPS.length;
  const x = useSharedValue(0);
  const placed = useSharedValue(0);

  useEffect(() => {
    if (!segment) return;
    const to = current * segment + UNDERLINE_INSET;
    // The first placement jumps; later steps glide (or fade across with reduced motion).
    if (!placed.value || reduced) {
      x.value = to;
      placed.value = withTiming(1, always(motion.duration.base));
    } else {
      x.value = withTiming(to, { duration: motion.duration.slow, easing: easeOut });
    }
  }, [current, segment, reduced, x, placed]);

  const underline = useAnimatedStyle(() => ({ opacity: placed.value, transform: [{ translateX: x.value }] }));

  return (
    <View style={styles.bar} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)} accessibilityRole="summary">
      {FLOW_STEPS.map((name, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'next';
        return (
          <View
            key={name}
            style={styles.segment}
            accessible
            accessibilityLabel={state === 'done' ? strings.stepDone(name) : state === 'current' ? strings.stepCurrent(name) : name}
          >
            {i > 0 ? <View style={[styles.connector, i <= current && styles.connectorDone]} /> : null}
            <Marker index={i} state={state} reduced={reduced} />
            <Text style={[styles.label, state === 'current' && styles.labelCurrent, state === 'done' && styles.labelDone]}>{name}</Text>
          </View>
        );
      })}
      {segment ? <Animated.View style={[styles.underline, { width: segment - UNDERLINE_INSET * 2 }, underline]} /> : null}
    </View>
  );
}

function Marker({ index, state, reduced }: { index: number; state: 'done' | 'current' | 'next'; reduced: boolean }) {
  // Keyed by state so a step turning done pops its tick in.
  const entering = reduced
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : ZoomIn.duration(motion.duration.base).easing(easeOut).withInitialValues({ transform: [{ scale: 0.5 }] });
  return (
    <Animated.View key={state} entering={entering} style={[styles.marker, styles[state]]}>
      {state === 'done' ? (
        <MaterialCommunityIcons name="check-bold" size={18} color={colors.textOnColor} />
      ) : (
        <Text style={[styles.markerText, state === 'current' && styles.markerTextCurrent]}>{index + 1}</Text>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignSelf: 'stretch', height: '100%' },
  segment: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  connector: { position: 'absolute', left: -28, width: 56, top: '50%', height: 2, borderRadius: 1, backgroundColor: colors.border },
  connectorDone: { backgroundColor: colors.successBright },
  marker: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  done: { backgroundColor: colors.successBright },
  current: { backgroundColor: colors.primary, boxShadow: '0px 3px 8px rgba(30, 107, 255, 0.30)' },
  next: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.borderDark },
  markerText: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 20, color: colors.textTertiary },
  markerTextCurrent: { color: colors.textOnColor },
  label: { ...typography.label, fontFamily: fonts.medium, color: colors.textTertiary },
  labelCurrent: { fontFamily: fonts.semibold, color: colors.textPrimary },
  labelDone: { color: colors.textSecondary },
  underline: { position: 'absolute', left: 0, bottom: 0, height: 4, borderRadius: radii.pill, backgroundColor: colors.primary },
});
