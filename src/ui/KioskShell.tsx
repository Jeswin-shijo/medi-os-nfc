import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, usePathname } from 'expo-router';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInUp, FadeOut, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import type { KioskConfig } from '../api/types';
import { isUnder, stepForRoute } from '../flow/steps';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { feedback } from '../motion/feedback';
import { PressableScale } from '../motion/Pressable';
import { clinicClock, formatHeaderTime } from '../lib/time';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, headerGradient, headerSubtle, motion, radii, sizes, spacing, typography } from '../theme/tokens';
import { Stepper } from './Stepper';

/** Holding the logo this long opens the staff menu. Nothing on screen says so: patients never find it by accident. */
const STAFF_HOLD_MS = 3000;

/**
 * The frame around every screen: the blue band (logo, hospital, clock, Start over) and the step
 * tracker. Start over and the tracker show on patient-flow routes only, not on Welcome, setup or staff.
 */
export function KioskShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const step = stepForRoute(pathname);
  const config = useKioskApp((s) => s.config);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const inFlow = step !== null;

  const openStaff = () => {
    // Staff sign-in needs the server address the kiosk has stored (none on a fresh install).
    if (isUnder(pathname, '/staff') || !useKioskApp.getState().address) return;
    feedback.tap();
    router.push('/staff');
  };

  // Start over and the tracker drop in from under the band; with reduced motion they only fade.
  const appear = reduced
    ? FadeIn.duration(motion.duration.slow).reduceMotion(ReduceMotion.Never)
    : FadeInUp.duration(motion.duration.slow).easing(easeOut).withInitialValues({ opacity: 0, transform: [{ translateY: -8 }] });
  const disappear = FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never);

  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.header,
          { paddingTop: insets.top, height: sizes.headerHeight + insets.top, paddingLeft: sizes.screenGutter + insets.left, paddingRight: sizes.screenGutter + insets.right },
        ]}
      >
        <Pressable
          onLongPress={openStaff}
          delayLongPress={STAFF_HOLD_MS}
          hitSlop={12}
          accessibilityLabel={strings.shell.logoHint}
          accessibilityRole="image"
        >
          <LogoTile />
        </Pressable>
        <View style={styles.brand}>
          <Text style={styles.hospital} numberOfLines={1}>
            {config?.hospital.name || strings.shell.fallbackName}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {strings.shell.subtitle}
          </Text>
        </View>
        <HeaderClock clinic={config?.clinic ?? null} />
        {inFlow ? (
          <Animated.View entering={appear} exiting={disappear}>
            <PressableScale
              onPress={() => useFlow.getState().resetFlow()}
              highlight="rgba(255, 255, 255, 0.16)"
              accessibilityLabel={strings.shell.startOver}
              style={styles.startOver}
            >
              <MaterialCommunityIcons name="restart" size={26} color={colors.textOnColor} />
              <Text style={styles.startOverText}>{strings.shell.startOver}</Text>
            </PressableScale>
          </Animated.View>
        ) : null}
      </LinearGradient>

      {/* Reserved on every route, so the screens below never jump when the tracker comes and goes. */}
      <View style={[styles.stepperZone, { paddingLeft: sizes.screenGutter + insets.left, paddingRight: sizes.screenGutter + insets.right }]}>
        {inFlow ? (
          <Animated.View entering={appear} exiting={disappear} style={styles.stepperInner}>
            <Stepper current={step} />
          </Animated.View>
        ) : null}
      </View>

      <View style={styles.content}>{children}</View>
    </View>
  );
}

/** The hospital mark: a rounded white tile with a blue cross. */
function LogoTile() {
  return (
    <View style={styles.logo}>
      <Svg width={34} height={34} viewBox="0 0 34 34">
        <Rect x={12} y={3} width={10} height={28} rx={3} fill={colors.primary} />
        <Rect x={3} y={12} width={28} height={10} rx={3} fill={colors.primary} />
      </Svg>
    </View>
  );
}

/** "Sat, 26 Sep 2026  10:24 AM" on the clinic's wall clock (the server's time, the clinic's day). */
function HeaderClock({ clinic }: { clinic: KioskConfig['clinic'] | null }) {
  const now = useMemo(() => (clinic ? clinicClock(clinic) : () => new Date()), [clinic]);
  const offset = clinic ? clinic.utcOffsetMinutes : -new Date().getTimezoneOffset();
  const [text, setText] = useState(() => formatHeaderTime(now(), offset));

  useEffect(() => {
    const tick = () => setText(formatHeaderTime(now(), offset));
    tick();
    // React skips the render when the minute has not changed.
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [now, offset]);

  return (
    <View style={styles.clock}>
      <MaterialCommunityIcons name="clock-outline" size={22} color={headerSubtle} />
      <Text style={styles.clockText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  logo: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 4px 12px rgba(8, 37, 110, 0.35)',
  },
  brand: { flex: 1, gap: 2, marginLeft: spacing.xs },
  hospital: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.textOnColor, letterSpacing: -0.2 },
  subtitle: { ...typography.caption, fontFamily: fonts.regular, color: headerSubtle },
  clock: { flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: spacing.sm },
  clockText: { fontFamily: fonts.medium, fontSize: 19, lineHeight: 24, color: colors.textOnColor, fontVariant: ['tabular-nums'] },
  startOver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    height: sizes.touchMin,
    paddingHorizontal: 24,
    borderRadius: radii.md,
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.45)',
  },
  startOverText: { ...typography.label, fontSize: 20, color: colors.textOnColor },
  stepperZone: { height: sizes.stepperHeight },
  stepperInner: { flex: 1, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { flex: 1 },
});
