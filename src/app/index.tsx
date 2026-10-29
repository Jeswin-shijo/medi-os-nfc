import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useIsFocused } from 'expo-router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeOut,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Rect } from 'react-native-svg';
import { KioskApiError } from '../api/client';
import { useCardTap } from '../card/useCardTap';
import { useFind } from '../flow/useFind';
import { currentGeneration, useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { Enter } from '../motion/Enter';
import { feedback } from '../motion/feedback';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, headerGradient, motion, radii, spacing, typography } from '../theme/tokens';
import { BigTile } from '../ui/BigTile';
import { Ripple } from '../ui/Ripple';
import { Screen } from '../ui/Screen';
import { useShake } from '../ui/Shake';
import { useLayout } from '../ui/useLayout';

/** idle: listening; reading: asking the server who the card belongs to; found: on the way to the next screen. */
type Phase = 'idle' | 'reading' | 'found';

/** How long "This card isn't linked yet…" stays. */
const NOTICE_MS = 6000;
/** How long "Hold your card flat on the card reader" replaces the tile's line after a press on it. */
const HINT_MS = 4000;
/** The rings burst outward before the slide to the patient's screen. */
const BURST_MS = 450;

type Timer = ReturnType<typeof setTimeout> | undefined;

/**
 * The first screen every patient sees: tap a card (the readers listen the whole time), find a
 * record by mobile number, or register as new. The tiles enter again for each new patient.
 */
export default function Welcome() {
  const config = useKioskApp((s) => s.config);
  const api = useKioskApp((s) => s.api);
  const ready = useKioskApp((s) => s.status === 'ready');
  const findByPhone = useKioskApp((s) => s.config?.findByPhone !== false);
  const focused = useIsFocused();
  const layout = useLayout();
  const compact = layout.size === 'compact';
  // Tiles sit side by side from 600 dp wide; a phone upright stacks them, the card tile first and full width.
  const stacked = compact;
  const { style: shakeStyle, shake } = useShake();
  const [phase, setPhase] = useState<Phase>('idle');
  const [notice, setNotice] = useState<string | null>(null);
  const [hint, setHint] = useState(false);
  const [round, setRound] = useState(0);
  const noticeTimer = useRef<Timer>(undefined);
  const hintTimer = useRef<Timer>(undefined);
  const leaveTimer = useRef<Timer>(undefined);
  const shownBefore = useRef(false);
  const inFlight = useRef(false);
  const begin = useRequestGuard();

  useEffect(
    () => () => {
      clearTimeout(noticeTimer.current);
      clearTimeout(hintTimer.current);
      clearTimeout(leaveTimer.current);
    },
    [],
  );

  // Back on Welcome for the next patient: a fresh screen, and the tiles enter again.
  useFocusEffect(
    useCallback(() => {
      // Back on Welcome by any route (Back included): no number or family list of the last person stays.
      useFind.getState().clear();
      if (shownBefore.current) {
        clearTimeout(noticeTimer.current);
        clearTimeout(hintTimer.current);
        setPhase('idle');
        setNotice(null);
        setHint(false);
        setRound((n) => n + 1);
      }
      shownBefore.current = true;
    }, []),
  );

  const showNotice = useCallback((message: string) => {
    clearTimeout(noticeTimer.current);
    setNotice(message);
    noticeTimer.current = setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);

  const identify = useCallback(
    async (cardId: string) => {
      // One lookup at a time: two cards (or NFC and USB) in the same moment, before the screen
      // stops listening, must not both identify and navigate.
      if (!api || inFlight.current) return;
      inFlight.current = true;
      const stale = begin();
      clearTimeout(hintTimer.current);
      setHint(false);
      setNotice(null);
      setPhase('reading');
      try {
        const result = await api.identifyCard(cardId);
        // Answered after the kiosk started over: the card belongs to someone who has left.
        if (stale()) {
          setPhase('idle');
          return;
        }
        useFlow.getState().setIdentity(result, 'card');
        const generation = currentGeneration();
        setPhase('found');
        feedback.success();
        clearTimeout(leaveTimer.current);
        leaveTimer.current = setTimeout(() => {
          if (currentGeneration() === generation) router.push(result.activeToken ? '/has-token' : '/patient');
        }, BURST_MS);
      } catch (err) {
        // A removed kiosk key has already sent the kiosk to its setup screen.
        if (stale()) {
          setPhase('idle');
          return;
        }
        if (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED') return;
        setPhase('idle');
        feedback.error();
        shake();
        // The server's message points to Find my record; without SMS that tile is not on the screen.
        const unknownWithoutFind = err instanceof KioskApiError && err.code === 'CARD_UNKNOWN' && !findByPhone;
        const serverMessage = err instanceof Error && err.message ? err.message : strings.errors.generic;
        showNotice(unknownWithoutFind ? strings.welcome.card.unknownAskCounter : serverMessage);
      } finally {
        inFlight.current = false;
      }
    },
    [api, begin, findByPhone, shake, showNotice],
  );

  const cardReader = useCardTap(identify, ready && phase === 'idle');

  const showHint = () => {
    clearTimeout(hintTimer.current);
    setHint(true);
    hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
  };

  const busy = phase !== 'idle';
  const cardLine =
    phase === 'reading'
      ? strings.welcome.card.reading
      : phase === 'found'
        ? strings.welcome.card.found
        : hint
          ? strings.welcome.card.hint
          : strings.welcome.card.subtitle;
  // About a third of the screen's height: 240 dp at 800, capped for the big tablets; smaller on phones.
  const rippleSize = compact
    ? Math.round(Math.min(200, layout.width * 0.5))
    : layout.short
      ? 150
      : Math.round(Math.min(320, Math.max(200, layout.height * 0.3)));
  const titleSize = compact ? 28 : layout.size === 'medium' ? 34 : 40;

  return (
    <View style={styles.screen}>
      {cardReader}
      <Screen resetKey={round}>
        <Fragment key={round}>
          <View style={styles.intro}>
            <Enter>
              <Text style={[styles.title, { fontSize: titleSize, lineHeight: Math.round(titleSize * 1.2) }]} accessibilityRole="header" numberOfLines={2}>
                {strings.welcome.title(config?.hospital.name ?? '')}
              </Text>
            </Enter>
            <Enter index={1}>
              <Text style={[styles.subtitle, { fontSize: layout.type.subtitle, lineHeight: Math.round(layout.type.subtitle * 1.36) }]}>{strings.welcome.subtitle}</Text>
            </Enter>
          </View>

          <View style={[styles.choices, stacked && styles.choicesStacked]}>
            <Enter index={2} style={stacked ? styles.fill : styles.cardColumn}>
              <Animated.View style={[styles.fill, shakeStyle]}>
                <BigTile
                  title={strings.welcome.card.title}
                  subtitle={cardLine}
                  badge={strings.welcome.card.badge}
                  badgeLive
                  paused={!focused}
                  selected={busy}
                  onPress={busy ? undefined : showHint}
                  art={<TapCardArt size={rippleSize} burst={phase === 'found'} paused={!focused} />}
                  style={styles.fill}
                />
              </Animated.View>
            </Enter>

            <View style={stacked ? styles.otherStacked : styles.otherColumn}>
              <Enter index={3} style={styles.fill}>
                {!findByPhone ? (
                  <AskAtCounter compact={compact} />
                ) : (
                  <BigTile
                    orientation="row"
                    title={strings.welcome.find.title}
                    subtitle={strings.welcome.find.subtitle}
                    icon="cellphone-message"
                    color={colors.purple}
                    disabled={busy}
                    onPress={() => router.push('/find')}
                    style={styles.fill}
                  />
                )}
              </Enter>
              <Enter index={4} style={styles.fill}>
                <BigTile
                  orientation="row"
                  title={strings.welcome.newPatient.title}
                  subtitle={strings.welcome.newPatient.subtitle}
                  icon="account-plus-outline"
                  color={colors.successBright}
                  disabled={busy}
                  onPress={() => router.push('/register')}
                  style={styles.fill}
                />
              </Enter>
            </View>
          </View>

          <View style={[styles.footer, { height: layout.touchMin }]}>
            {notice ? <Notice key="notice" message={notice} /> : <Help key="help" />}
          </View>
        </Fragment>
      </Screen>
    </View>
  );
}

/**
 * The patient card above the reader: a little hospital card floating up and down inside the
 * ripple rings, which burst outward when a card is read. Still with reduced motion.
 */
function TapCardArt({ size, burst, paused }: { size: number; burst: boolean; paused: boolean }) {
  const reduced = useReducedMotion();
  const float = useSharedValue(0);

  useEffect(() => {
    if (reduced || paused) {
      cancelAnimation(float);
      return;
    }
    float.value = withRepeat(withTiming(1, { duration: 1600, easing: Easing.inOut(Easing.sin) }), -1, true);
    return () => cancelAnimation(float);
  }, [reduced, paused, float]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -7 * float.value }, { rotate: '-8deg' }],
  }));

  const width = Math.round(size * 0.48);
  const height = Math.round(width * 0.63);
  const mark = Math.round(height * 0.3);

  return (
    <View importantForAccessibility="no-hide-descendants">
      <Ripple size={size} burst={burst} paused={paused}>
        <Animated.View style={[styles.cardShadow, { width, height, borderRadius: radii.sm }, floatStyle]}>
          <LinearGradient
            colors={headerGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.cardFace, { borderRadius: radii.sm, padding: Math.round(height * 0.14) }]}
          >
            <View style={styles.cardTop}>
              <View style={[styles.cardMark, { width: mark + 10, height: mark + 10, borderRadius: radii.xs }]}>
                <Svg width={mark} height={mark} viewBox="0 0 34 34">
                  <Rect x={12} y={3} width={10} height={28} rx={3} fill={colors.primary} />
                  <Rect x={3} y={12} width={28} height={10} rx={3} fill={colors.primary} />
                </Svg>
              </View>
              <MaterialCommunityIcons name="contactless-payment" size={Math.round(height * 0.36)} color={colors.textOnColor} />
            </View>
            <View style={styles.cardLines}>
              <View style={[styles.cardLine, { width: '72%' }]} />
              <View style={[styles.cardLine, { width: '44%', opacity: 0.35 }]} />
            </View>
          </LinearGradient>
        </Animated.View>
      </Ripple>
    </View>
  );
}

/** In place of Find my record when the kiosk cannot send codes: the counter finds the record. */
function AskAtCounter({ compact }: { compact: boolean }) {
  return (
    <View style={[styles.askCard, compact && styles.askCardCompact]} accessible accessibilityLabel={`${strings.welcome.findOff.title} ${strings.welcome.findOff.body}`}>
      <View style={[styles.askIcon, compact && styles.askIconCompact]}>
        <MaterialCommunityIcons name="face-agent" size={compact ? 30 : 38} color={colors.textSecondary} />
      </View>
      <View style={styles.askText}>
        <Text style={styles.askTitle}>{strings.welcome.findOff.title}</Text>
        <Text style={styles.askBody}>{strings.welcome.findOff.body}</Text>
      </View>
    </View>
  );
}

const footerIn = (reduced: boolean) =>
  reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(motion.duration.slow).easing(easeOut).withInitialValues({ opacity: 0, transform: [{ translateY: 10 }] });
const footerOut = FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never);

function Help() {
  const reduced = useReducedMotion();
  const { type } = useLayout();
  return (
    <Animated.View entering={footerIn(reduced)} exiting={footerOut} style={styles.help}>
      <MaterialCommunityIcons name="face-agent" size={26} color={colors.textTertiary} />
      <Text style={[styles.helpText, { fontSize: type.body, lineHeight: Math.round(type.body * 1.4) }]} numberOfLines={2}>
        {strings.welcome.help}
      </Text>
    </Animated.View>
  );
}

/** "This card isn't linked yet…": a calm amber note where the help line was, for 6 s. */
function Notice({ message }: { message: string }) {
  const reduced = useReducedMotion();
  const { type } = useLayout();
  return (
    <Animated.View
      entering={footerIn(reduced)}
      exiting={footerOut}
      style={styles.notice}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons name="card-account-details-outline" size={30} color={colors.warningText} />
      <Text style={[styles.noticeText, { fontSize: type.body, lineHeight: Math.round(type.body * 1.4) }]} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // Fill blocks grow from their own height (not flex: 1), so a short window scrolls instead of squashing them.
  fill: { flexGrow: 1 },
  intro: { gap: 6 },
  title: { fontFamily: fonts.bold, letterSpacing: -0.6, color: colors.textPrimary },
  subtitle: { fontFamily: typography.bodyLarge.fontFamily, color: colors.textSecondary },
  choices: { flexGrow: 1, flexDirection: 'row', gap: spacing.lg },
  choicesStacked: { flexDirection: 'column' },
  // The card is the fastest way in, so it gets the most room.
  cardColumn: { flex: 11 },
  otherColumn: { flex: 10, gap: spacing.lg },
  otherStacked: { gap: spacing.md },
  cardShadow: { boxShadow: '0px 10px 22px rgba(14, 80, 214, 0.32)' },
  cardFace: { flex: 1, justifyContent: 'space-between', overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardMark: { backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  cardLines: { gap: 6 },
  cardLine: { height: 6, borderRadius: radii.pill, backgroundColor: colors.textOnColor, opacity: 0.6 },
  askCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 28,
    paddingVertical: 24,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
  },
  askCardCompact: { gap: 14, paddingHorizontal: 16, paddingVertical: 16 },
  askIconCompact: { width: 56, height: 56, borderRadius: 18 },
  askIcon: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  askText: { flex: 1, gap: 4 },
  askTitle: { ...typography.headline, color: colors.textPrimary },
  askBody: { ...typography.body, fontSize: 18, lineHeight: 24, color: colors.textSecondary },
  footer: {},
  help: { ...StyleSheet.absoluteFill, flexDirection: 'row', alignItems: 'center', gap: 12 },
  helpText: { ...typography.body, color: colors.textSecondary },
  notice: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
  },
  noticeText: { ...typography.body, fontFamily: fonts.medium, color: colors.warningText, flexShrink: 1 },
});
