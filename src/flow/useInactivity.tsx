import { usePathname } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, motion, radii, shadows, typography } from '../theme/tokens';
import { Button } from '../ui/Button';
import { useCountdown } from '../ui/Countdown';
import { RingCountdown } from '../ui/RingCountdown';
import { idleLimitSeconds, WARNING_SECONDS } from './inactivity';
import { useFlow } from './useFlow';

/** Used until the kiosk configuration (with its own idle limit) has loaded. */
const DEFAULT_IDLE_SECONDS = 60;

const activityListeners = new Set<() => void>();

/**
 * Counts as a touch. Typing on the system keyboard happens outside the app's views,
 * so text fields call this from `onChangeText`.
 */
export function markActive(): void {
  activityListeners.forEach((listener) => listener());
}

/**
 * Wraps the whole app: any touch restarts the idle clock for the current route
 * (`idleLimitSeconds`). When it runs out, "Are you still there?" counts down 10 s, then the
 * kiosk starts over (`resetFlow`).
 */
export function InactivityGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const idleSeconds = useKioskApp((s) => s.config?.idleSeconds ?? DEFAULT_IDLE_SECONDS);
  const limit = idleLimitSeconds(pathname, { idleSeconds });
  const [asking, setAsking] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const arm = useCallback(() => {
    clearTimeout(timer.current);
    if (limit !== null) timer.current = setTimeout(() => setAsking(true), limit * 1000);
  }, [limit]);

  /** A touch: a fresh clock, and the question goes away. */
  const restart = useCallback(() => {
    setAsking(false);
    arm();
  }, [arm]);

  // Every new screen starts a fresh clock.
  useEffect(() => {
    arm();
    return () => clearTimeout(timer.current);
  }, [arm, pathname]);

  useEffect(() => {
    activityListeners.add(restart);
    return () => {
      activityListeners.delete(restart);
    };
  }, [restart]);

  const timeUp = useCallback(() => {
    setAsking(false);
    useFlow.getState().resetFlow();
  }, []);

  return (
    <View style={styles.fill}>
      {/* onTouchStart only watches: it never takes the touch from the control underneath. */}
      <View style={styles.fill} onTouchStart={restart}>
        {children}
      </View>
      {asking ? <StillThere onStay={restart} onStartOver={timeUp} /> : null}
    </View>
  );
}

/** The "Are you still there?" dialog: a ring counting down 10 s. A touch anywhere keeps the patient's place. */
export function StillThere({ onStay, onStartOver }: { onStay: () => void; onStartOver: () => void }) {
  const reduced = useReducedMotion();
  const left = useCountdown(WARNING_SECONDS, onStartOver);
  const card = reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : ZoomIn.duration(motion.duration.slow).easing(easeOut).withInitialValues({ transform: [{ scale: 0.94 }] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.scrim]}
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
      exiting={FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)}
      accessibilityViewIsModal
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onStay} accessibilityLabel={strings.idle.stay} />
      {/* A touch on the card itself (not on its buttons) also means "still here". */}
      <Animated.View
        entering={card}
        style={styles.card}
        accessibilityRole="alert"
        onStartShouldSetResponder={() => true}
        onResponderRelease={onStay}
      >
        <RingCountdown seconds={WARNING_SECONDS} size={136} strokeWidth={10}>
          <Text style={styles.number} accessibilityLabel={strings.idle.secondsLeft(left)}>
            {left}
          </Text>
        </RingCountdown>
        <View style={styles.copy}>
          <Text style={styles.title}>{strings.idle.title}</Text>
          <Text style={styles.body}>{strings.idle.body}</Text>
        </View>
        <View style={styles.actions}>
          <Button label={strings.idle.startOver} variant="secondary" icon="restart" onPress={onStartOver} style={styles.action} />
          <Button label={strings.idle.stay} icon="hand-wave-outline" onPress={onStay} style={styles.action} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scrim: { backgroundColor: colors.scrim, alignItems: 'center', justifyContent: 'center' },
  card: {
    width: 600,
    maxWidth: '90%',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 40,
    paddingTop: 40,
    paddingBottom: 32,
    borderRadius: radii.xl,
    backgroundColor: colors.card,
    boxShadow: shadows.dialog,
  },
  number: { fontFamily: fonts.bold, fontSize: 48, lineHeight: 56, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  copy: { alignItems: 'center', gap: 8 },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 16, alignSelf: 'stretch' },
  action: { flex: 1 },
});
