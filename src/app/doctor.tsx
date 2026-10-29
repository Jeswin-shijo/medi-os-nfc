import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown, FadeOut, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from 'react-native-reanimated';
import { KioskApiError } from '../api/client';
import type { AvailabilityState, KioskDoctor, KioskTokenView } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { Enter } from '../motion/Enter';
import { feedback } from '../motion/feedback';
import { PressableScale } from '../motion/Pressable';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button, type IconName } from '../ui/Button';
import { LiveDot } from '../ui/LiveDot';
import { doctorCardMetrics, doctorSkeletonHeight, gridGap, gridItemWidth, gridWidth } from '../ui/paySizing';
import { PickFrame } from '../ui/PickFrame';
import { Screen } from '../ui/Screen';
import { Skeleton } from '../ui/Skeleton';
import { StatusPanel } from '../ui/StatusPanel';
import { StepTitle } from '../ui/StepTitle';
import { useLayout } from '../ui/useLayout';

const TOAST_MS = 4000;
const SKELETON_COUNT = 4;

type Timer = ReturnType<typeof setTimeout> | undefined;

/** Why this visit cannot go on from this screen: a calm panel instead of the list. */
type Blocked = { kind: 'cash' | 'ended'; message: string };

/** Step 4: pick a doctor. Fresh availability every time the screen opens. */
export default function Doctor() {
  const api = useKioskApp((s) => s.api);
  const session = useFlow((s) => s.session);
  const department = useFlow((s) => s.department);
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const begin = useRequestGuard();
  const loadSeq = useRef(0);
  const loaded = useRef(false);
  const inFlight = useRef(false);
  const toastTimer = useRef<Timer>(undefined);
  const [doctors, setDoctors] = useState<KioskDoctor[] | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<Blocked | null>(null);
  const code = department?.code;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  const load = useCallback(async () => {
    if (!api || !code) return;
    const mine = ++loadSeq.current;
    const stale = begin();
    setFailed(null);
    try {
      const list = await api.doctors(code);
      if (stale() || mine !== loadSeq.current) return;
      loaded.current = true;
      setDoctors(list);
    } catch (err) {
      // A removed kiosk key has already sent the kiosk to its setup screen.
      if (stale() || mine !== loadSeq.current || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      // A list already on screen stays: a failed refresh is not worth blanking it for.
      if (!loaded.current) setFailed(err instanceof Error && err.message ? err.message : strings.doctor.loadFailed);
    }
  }, [api, code, begin]);

  // Opening the screen, and coming back to it from the payment screen: the chosen card drops back and availability is fresh.
  useFocusEffect(
    useCallback(() => {
      setPendingId(null);
      void load();
    }, [load]),
  );

  const showToast = (message: string) => {
    clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), TOAST_MS);
  };

  const choose = async (doctor: KioskDoctor) => {
    // At most one visit per tap run: a second tap before the answer must not start another, which
    // would hand back a visit the backend has just replaced.
    if (!api || !session || inFlight.current || !doctor.availability.bookable) return;
    inFlight.current = true;
    const stale = begin();
    setPendingId(doctor.id);
    try {
      const visit = await api.createVisit(session, doctor.id);
      if (stale()) return;
      useFlow.getState().setDoctor(doctor);
      useFlow.getState().setVisit(visit);
      // The card stays lifted while the payment screen slides in; the focus effect drops it on return.
      router.push('/payment');
    } catch (err) {
      if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      setPendingId(null);
      feedback.error();
      const reason = err instanceof KioskApiError ? err.code : undefined;
      const token = err instanceof KioskApiError ? (err.data?.token as KioskTokenView | undefined) : undefined;
      if (reason === 'HAS_TOKEN' && token) {
        // Someone issued them a token meanwhile: show that one, no payment.
        useFlow.setState({ activeToken: token });
        router.push('/has-token');
      } else if (reason === 'DOCTOR_NOT_BOOKABLE') {
        showToast(strings.doctor.noLongerAvailable);
        void load();
      } else if (reason === 'CASH_PENDING') {
        setBlocked({ kind: 'cash', message: err instanceof Error ? err.message : strings.errors.generic });
      } else if (reason === 'SESSION_ENDED') {
        setBlocked({ kind: 'ended', message: err instanceof Error ? err.message : strings.errors.generic });
      } else {
        showToast(err instanceof Error && err.message ? err.message : strings.errors.generic);
      }
    } finally {
      inFlight.current = false;
    }
  };

  if (!session) return <Redirect href="/" />;
  if (!department) return <Redirect href="/department" />;

  if (blocked) return <BlockedPanel blocked={blocked} />;

  // One across on a phone upright, two on a tablet, three on the big tablet.
  const columns = layout.columns('doctor');
  const gap = gridGap(layout);
  const cardWidth = gridItemWidth(gridWidth(layout, insets.left, insets.right), columns, gap);
  // The note must not cover cards on a phone or a short window: it takes its own line above the bottom edge.
  const inline = layout.size === 'compact' || layout.short;
  const empty = layout.short ? { minHeight: 200 } : null;

  const header = <StepTitle title={strings.doctor.title} subtitle={strings.doctor.subtitle(department.name)} />;
  const footer = (
    <Enter index={2} style={styles.actions}>
      <Button label={strings.doctor.changeDepartment} variant="quiet" icon="arrow-left" disabled={pendingId !== null} onPress={() => router.back()} />
    </Enter>
  );

  return (
    <PickFrame
      header={header}
      footer={footer}
      grid={!!doctors && doctors.length > 0 && !failed}
      notice={inline && toast ? <Toast key={toast} message={toast} inline /> : null}
      overlay={!inline && toast ? <Toast key={toast} message={toast} gutter={layout.gutter} /> : null}
    >
      {failed ? (
        <StatusPanel state="error" message={failed} onRetry={() => void load()} style={empty} />
      ) : doctors === null ? (
        <View style={[styles.grid, { gap }]} accessibilityRole="progressbar" accessibilityLabel={strings.status.loading}>
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <Skeleton key={i} style={[styles.skeleton, { width: cardWidth, height: doctorSkeletonHeight(layout) }]} />
          ))}
        </View>
      ) : doctors.length === 0 ? (
        <Enter style={[styles.empty, empty]}>
          <Text style={styles.emptyText}>{strings.doctor.empty}</Text>
        </Enter>
      ) : (
        <View style={[styles.grid, { gap }]}>
          {doctors.map((doctor, i) => (
            <Enter key={doctor.id} index={i} style={{ width: cardWidth }}>
              <DoctorCard
                doctor={doctor}
                width={cardWidth}
                selected={pendingId === doctor.id}
                locked={pendingId !== null}
                onSelect={() => void choose(doctor)}
              />
            </Enter>
          ))}
        </View>
      )}
    </PickFrame>
  );
}

const PILL: Record<AvailabilityState, { icon: IconName; ink: string; wash: string }> = {
  now: { icon: 'check-circle-outline', ink: colors.success, wash: colors.accentLight },
  busy: { icon: 'timer-sand', ink: colors.warningText, wash: colors.warningLight },
  later: { icon: 'clock-outline', ink: colors.primaryDark, wash: colors.primaryLight },
  done: { icon: 'calendar-remove-outline', ink: colors.textSecondary, wash: colors.surfaceSunken },
  off: { icon: 'calendar-remove-outline', ink: colors.textSecondary, wash: colors.surfaceSunken },
};

interface DoctorCardProps {
  doctor: KioskDoctor;
  /** The card's own width: narrow cards use smaller type and put the select button under the facts. */
  width: number;
  /** This card was tapped and its visit is being made: it lifts. */
  selected: boolean;
  /** Some card is being handled: none of them takes another tap. */
  locked: boolean;
  onSelect: () => void;
}

function DoctorCard({ doctor, width, selected, locked, onSelect }: DoctorCardProps) {
  const layout = useLayout();
  const metrics = doctorCardMetrics(width);
  const reduced = useReducedMotion();
  const lift = useSharedValue(0);
  useEffect(() => {
    lift.value = withSpring(selected ? 1 : 0, motion.spring.settle);
  }, [selected, lift]);
  const liftStyle = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + 0.02 * lift.value }] }));

  const { availability } = doctor;
  const bookable = availability.bookable;
  const look = PILL[availability.state];

  return (
    <Animated.View style={[liftStyle, locked && !selected && styles.dim]}>
      <PressableScale
        onPress={onSelect}
        disabled={!bookable || locked}
        highlight="rgba(30, 107, 255, 0.07)"
        accessibilityLabel={strings.doctor.cardLabel(doctor.name, doctor.qualifications, doctor.fee, doctor.room, availability.label, bookable)}
        accessibilityState={{ selected }}
        style={[styles.card, { padding: metrics.padding }, !bookable && styles.cardOff, selected && styles.cardSelected]}
      >
        <View style={styles.top}>
          <Avatar name={doctor.name} size={metrics.avatar} />
          <View style={styles.who}>
            <Text style={[styles.name, !bookable && styles.offInk]} numberOfLines={2}>
              {doctor.name}
            </Text>
            <Text style={styles.quals} numberOfLines={2}>
              {doctor.qualifications}
            </Text>
          </View>
          <Text style={[styles.fee, { fontSize: metrics.feeFont, lineHeight: metrics.feeLine }, !bookable && styles.offInk]}>{strings.doctor.fee(doctor.fee)}</Text>
        </View>

        <View style={[styles.bottom, metrics.narrow && styles.bottomNarrow]}>
          <View style={styles.facts}>
            <View style={[styles.pill, { backgroundColor: look.wash }]}>
              {availability.state === 'now' ? (
                <LiveDot color={colors.successBright} size={10} />
              ) : (
                <MaterialCommunityIcons name={look.icon} size={22} color={look.ink} />
              )}
              <Text style={[styles.pillText, { color: look.ink }]} numberOfLines={1}>
                {availability.label}
              </Text>
            </View>
            <View style={styles.room}>
              <MaterialCommunityIcons name="door-open" size={22} color={colors.textTertiary} />
              <Text style={styles.roomText} numberOfLines={1}>
                {doctor.room}
              </Text>
            </View>
          </View>
          {/* Looks like a button; the whole card is the one touch target. */}
          <View style={[styles.select, { minHeight: layout.touchMin }, metrics.narrow && styles.selectNarrow, bookable ? styles.selectOn : styles.selectOff]}>
            <Text style={[styles.selectText, !bookable && { color: colors.textTertiary }]}>
              {selected ? strings.doctor.selecting : strings.doctor.select}
            </Text>
          </View>
        </View>
      </PressableScale>
    </Animated.View>
  );
}

/** A short note over the bottom of the screen: "That doctor is no longer available." */
function Toast({ message, inline = false, gutter = 0 }: { message: string; inline?: boolean; gutter?: number }) {
  const layout = useLayout();
  const reduced = useReducedMotion();
  const entering = reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(motion.duration.slow).easing(easeOut).withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
  return (
    <Animated.View
      entering={entering}
      exiting={FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)}
      style={[inline ? styles.toastInline : [styles.toast, { left: gutter, right: gutter }], { minHeight: layout.touchMin }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      pointerEvents="none"
    >
      <MaterialCommunityIcons name="information-outline" size={28} color={colors.warningText} />
      <Text style={styles.toastText} numberOfLines={2}>
        {message}
      </Text>
    </Animated.View>
  );
}

/** A cash payment already waits at the counter, or the session ended: say so plainly and let the patient finish. */
function BlockedPanel({ blocked }: { blocked: Blocked }) {
  const layout = useLayout();
  const compact = layout.size === 'compact';
  const cash = blocked.kind === 'cash';
  const title = cash ? strings.doctor.cashPending.title : strings.doctor.sessionEnded.title;
  return (
    <Screen>
      <Enter style={[styles.blocked, compact && styles.blockedCompact]}>
        <View accessibilityRole="alert" accessible accessibilityLabel={`${title}. ${blocked.message}`} style={styles.blockedCopy}>
          <View style={styles.blockedIcon}>
            <MaterialCommunityIcons name={cash ? 'cash-clock' : 'timer-off-outline'} size={52} color={colors.warningText} />
          </View>
          <Text style={[styles.blockedTitle, { fontSize: layout.type.title, lineHeight: Math.round(layout.type.title * 1.24) }]}>{title}</Text>
          <Text style={[styles.blockedBody, { fontSize: layout.type.body + 2, lineHeight: Math.round((layout.type.body + 2) * 1.36) }]}>{blocked.message}</Text>
        </View>
        <Enter index={2}>
          <Button
            label={cash ? strings.doctor.cashPending.done : strings.doctor.sessionEnded.startOver}
            size="large"
            icon="check"
            onPress={() => useFlow.getState().resetFlow()}
            style={compact ? undefined : styles.blockedButton}
          />
        </Enter>
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  skeleton: { borderRadius: radii.lg },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  emptyText: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center', maxWidth: 640 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
  dim: { opacity: 0.6 },
  card: {
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  cardOff: { backgroundColor: colors.surfaceSunken, boxShadow: 'none' },
  cardSelected: { borderColor: colors.primary, borderWidth: 2, boxShadow: shadows.lifted },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  who: { flex: 1, gap: 2 },
  name: { ...typography.headline, color: colors.textPrimary },
  quals: { ...typography.body, fontSize: 18, lineHeight: 24, color: colors.textSecondary },
  offInk: { color: colors.textSecondary },
  fee: { fontFamily: fonts.bold, fontSize: 30, lineHeight: 38, color: colors.primaryDark, fontVariant: ['tabular-nums'] },
  bottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  bottomNarrow: { flexDirection: 'column', alignItems: 'stretch' },
  facts: { flex: 1, gap: 10 },
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 10, paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill },
  pillText: { ...typography.label, flexShrink: 1 },
  room: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2 },
  roomText: { ...typography.caption, fontSize: 18, lineHeight: 24, color: colors.textSecondary },
  select: { minWidth: 160, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24, borderRadius: radii.md },
  selectNarrow: { minWidth: 0, alignSelf: 'stretch' },
  selectOn: { backgroundColor: colors.primary, boxShadow: shadows.primaryButton },
  selectOff: { backgroundColor: colors.surfaceSunken, borderWidth: 1.5, borderColor: colors.border },
  selectText: { ...typography.button, color: colors.textOnColor },
  toast: {
    position: 'absolute',
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
    boxShadow: shadows.lifted,
  },
  toastInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
  },
  toastText: { ...typography.body, fontFamily: fonts.medium, color: colors.warningText, flexShrink: 1 },
  blocked: {
    flexGrow: 1,
    minHeight: 320,
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
  blockedCompact: { gap: spacing.lg, padding: spacing.md },
  blockedCopy: { alignItems: 'center', gap: spacing.md, maxWidth: 760 },
  blockedIcon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
  blockedTitle: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  blockedBody: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center' },
  blockedButton: { minWidth: 300 },
});
