import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  cancelAnimation,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { colors, fonts, motion, radii } from '../theme/tokens';
import { useShake } from './Shake';

export type OtpStatus = 'idle' | 'error' | 'success';

interface OtpBoxesProps {
  value: string;
  length?: number;
  /** 'error' shakes the boxes and turns them red; 'success' flashes them green. */
  status?: OtpStatus;
}

/**
 * The code, one box per digit. The next box to fill glows; each digit pops in as it lands.
 * Shown, not typed into: the number pad feeds `value`.
 */
export function OtpBoxes({ value, length = 6, status = 'idle' }: OtpBoxesProps) {
  const { style: shakeStyle, shake } = useShake();
  useEffect(() => {
    if (status === 'error') shake();
  }, [status, shake]);

  return (
    <Animated.View
      style={[styles.row, shakeStyle]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={strings.otp.label(value.length, length)}
    >
      {Array.from({ length }, (_, i) => (
        <Box key={i} index={i} digit={value[i]} active={status === 'idle' && i === value.length} status={status} />
      ))}
    </Animated.View>
  );
}

function Box({ index, digit, active, status }: { index: number; digit?: string; active: boolean; status: OtpStatus }) {
  const reduced = useReducedMotion();
  const glow = useSharedValue(0);
  const pulse = useSharedValue(1);

  // The active box breathes so the eye finds where the next digit goes.
  useEffect(() => {
    if (!active) {
      cancelAnimation(glow);
      glow.value = withTiming(0, { duration: motion.duration.fast, reduceMotion: ReduceMotion.Never });
      return;
    }
    if (reduced) {
      glow.value = 1;
      return;
    }
    glow.value = withSequence(withTiming(1, { duration: motion.duration.fast }), withRepeat(withTiming(0.45, { duration: 900 }), -1, true));
    return () => cancelAnimation(glow);
  }, [active, reduced, glow]);

  // A right code ripples across the boxes, left to right.
  useEffect(() => {
    if (status !== 'success' || reduced) return;
    pulse.value = withDelay(index * 40, withSequence(withTiming(1.08, { duration: 120, easing: easeOut }), withTiming(1, { duration: 160 })));
  }, [status, reduced, index, pulse]);

  const ringStyle = useAnimatedStyle(() => ({ opacity: glow.value }));
  const boxStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));

  const tone =
    status === 'error' ? styles.error : status === 'success' ? styles.success : active ? styles.active : digit ? styles.filled : null;
  const entering = reduced
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : ZoomIn.duration(motion.duration.fast).easing(easeOut).withInitialValues({ transform: [{ scale: 0.4 }] });

  return (
    <Animated.View style={[styles.box, tone, boxStyle]}>
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />
      {digit ? (
        <Animated.Text key={`${index}-${digit}`} entering={entering} style={[styles.digit, status === 'error' && styles.digitError]}>
          {digit}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 14, alignSelf: 'center' },
  box: {
    width: 72,
    height: 88,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: { position: 'absolute', top: -7, left: -7, right: -7, bottom: -7, borderRadius: radii.md + 6, borderWidth: 4, borderColor: 'rgba(30, 107, 255, 0.22)' },
  active: { borderColor: colors.primary },
  filled: { borderColor: colors.borderDark },
  error: { borderColor: colors.dangerStrong, backgroundColor: colors.dangerLight },
  success: { borderColor: colors.success, backgroundColor: colors.accentLight },
  digit: { fontFamily: fonts.semibold, fontSize: 40, lineHeight: 48, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  digitError: { color: colors.dangerStrong },
});
