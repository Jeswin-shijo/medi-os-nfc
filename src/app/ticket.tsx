import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  ReduceMotion,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Line, Path } from 'react-native-svg';
import type { KioskTokenView, VisitView } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { always, easeOut } from '../motion/curves';
import { Enter } from '../motion/Enter';
import { usePrintSlip, type SlipStatus } from '../printer/printSlip';
import { colors, fonts, motion, radii, shadows, sizes as tokenSizes, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from '../ui/Button';
import { useCountdown } from '../ui/Countdown';
import { QrView } from '../ui/QrView';
import { RingCountdown } from '../ui/RingCountdown';
import { RollingNumber } from '../ui/RollingNumber';
import { Screen } from '../ui/Screen';
import { SLIP_WINDOW_PAD, ticketSizes, type TicketSizes } from '../ui/ticketSizing';
import { useLayout } from '../ui/useLayout';

/** Seconds without a touch before the ticket goes back to Welcome (the screen's own ring; the idle guard stays out). */
const RETURN_SECONDS = 30;
/** The slip slides out of the slot: the kiosk's one long effect. */
const SLIP_MS = 700;
const SLIP_DELAY_MS = 120;
/** The token starts rolling while the slip settles; the QR fades in once it has. */
const ROLL_DELAY_MS = 520;
const QR_DELAY_MS = SLIP_DELAY_MS + SLIP_MS;
const SLOT_HEIGHT = 22;

/** Step 8: the OP ticket. Shown once the visit is paid and its token is there; prints by itself once. */
export default function Ticket() {
  const visit = useFlow((s) => s.visit);
  if (!visit) return <Redirect href="/" />;
  // The payment screen waits for the token (or sends the patient to the desk); it never comes here without one.
  if (visit.status !== 'paid' || !visit.token) return <Redirect href="/paid" />;
  return <TicketScreen visit={visit} token={visit.token} />;
}

function TicketScreen({ visit, token }: { visit: VisitView; token: KioskTokenView }) {
  const patient = useFlow((s) => s.patient);
  const via = useFlow((s) => s.via) ?? visit.via;
  const layout = useLayout();
  const sizes = ticketSizes(layout);
  const slip = useMemo(() => ({ visit, patient }), [visit, patient]);
  const printer = usePrintSlip(slip, { auto: true });
  // Any touch starts the 30 s return over.
  const [round, setRound] = useState(0);
  const leaving = useRef(false);

  const goHome = () => {
    if (leaving.current) return;
    leaving.current = true;
    useFlow.getState().resetFlow();
  };

  const name = patient?.name ?? visit.patient.name;
  const showCardNote = via === 'otp' || via === 'register';

  return (
    <View style={styles.fill} onTouchStart={() => setRound((n) => n + 1)}>
      <Screen style={{ gap: spacing.md + 4 }}>
        <Enter style={styles.banner}>
          <View style={[styles.bannerIcon, { width: sizes.bannerIcon, height: sizes.bannerIcon, borderRadius: sizes.bannerIcon / 2 }]}>
            <MaterialCommunityIcons name="check-bold" size={sizes.bannerIcon > 48 ? 30 : 26} color={colors.textOnColor} />
          </View>
          <View style={styles.bannerText}>
            <Text style={[styles.title, sizes.title]} accessibilityRole="header" accessibilityLiveRegion="polite">
              {strings.ticket.title}
            </Text>
            {sizes.showSubtitle ? <Text style={[styles.subtitle, { fontSize: layout.type.body }]}>{strings.ticket.subtitle(name)}</Text> : null}
          </View>
        </Enter>

        <View style={[styles.body, sizes.stacked ? styles.bodyStacked : { gap: sizes.gap }]}>
          <SlipOut stacked={sizes.stacked}>
            <PaperTicket visit={visit} token={token} sizes={sizes} />
          </SlipOut>

          <View style={[styles.side, sizes.stacked ? styles.sideStacked : { width: sizes.sideWidth }]}>
            <Enter delay={QR_DELAY_MS} style={[styles.qrCard, { padding: sizes.cardPadding }, sizes.qrColumn && styles.qrCardColumn]}>
              {token.trackUrl ? (
                <>
                  <QrView value={token.trackUrl} size={sizes.qr} accessibilityLabel={strings.ticket.scanTitle} />
                  <View style={[styles.qrText, sizes.qrColumn && styles.qrTextColumn]}>
                    <Text style={styles.qrTitle}>{strings.ticket.scanTitle}</Text>
                    <Text style={styles.qrBody}>{strings.ticket.scanBody}</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.waitIcon}>
                    <MaterialCommunityIcons name="seat-outline" size={40} color={colors.primaryDark} />
                  </View>
                  <View style={[styles.qrText, sizes.qrColumn && styles.qrTextColumn]}>
                    <Text style={styles.qrTitle}>{strings.ticket.noTrackTitle}</Text>
                    <Text style={styles.qrBody}>{strings.ticket.noTrackBody}</Text>
                  </View>
                </>
              )}
            </Enter>

            {showCardNote ? (
              <Enter delay={180} index={2} style={styles.cardNote}>
                <MaterialCommunityIcons name="card-account-details-outline" size={30} color={colors.purple} />
                <Text style={styles.cardNoteText}>{strings.ticket.collectCard}</Text>
              </Enter>
            ) : null}

            {printer.status === 'off' ? null : (
              <Enter delay={180} index={3} style={styles.printRow}>
                <View style={styles.printStatus} accessibilityLiveRegion="polite">
                  <PrintStatus status={printer.status} />
                </View>
                {printer.status === 'checking' || printer.status === 'no-printer' ? null : (
                  <Button
                    label={strings.ticket.printAgain}
                    variant="secondary"
                    icon="printer-outline"
                    disabled={!printer.canPrint}
                    onPress={printer.print}
                  />
                )}
              </Enter>
            )}

            <Enter delay={180} index={4} style={styles.actions}>
              <ReturnRing key={round} onDone={goHome} />
              <Button label={strings.ticket.done} size="large" icon="check" onPress={goHome} style={styles.done} />
            </Enter>
          </View>
        </View>
      </Screen>
    </View>
  );
}

/** The digital ticket: OP number and time, the token, the queue, then the visit. */
function PaperTicket({ visit, token, sizes }: { visit: VisitView; token: KioskTokenView; sizes: TicketSizes }) {
  const method = visit.method ? strings.paid.modes[visit.method] : undefined;
  return (
    <View style={styles.paper}>
      <View style={[styles.paperBody, { paddingHorizontal: sizes.paperPadX, paddingTop: sizes.paperPadTop }]}>
        <View style={styles.paperTop}>
          <View style={styles.topCell}>
            <Text style={styles.caption}>{strings.ticket.opNumber}</Text>
            <Text style={styles.opNumber} numberOfLines={1}>
              {visit.opNumber ?? ''}
            </Text>
          </View>
          {visit.paidAtDisplay ? (
            <View style={[styles.topCell, styles.topCellEnd]}>
              <Text style={styles.caption}>{strings.ticket.when}</Text>
              <Text style={styles.when} numberOfLines={1}>
                {visit.paidAtDisplay}
              </Text>
            </View>
          ) : null}
        </View>

        <Perforation bleed={sizes.paperPadX} />

        <View style={styles.tokenZone} accessible accessibilityLabel={`${strings.ticket.yourToken} ${token.label}`}>
          <Text style={styles.tokenCaption} importantForAccessibility="no">
            {strings.ticket.yourToken}
          </Text>
          <RollingNumber value={token.label} style={[styles.token, sizes.token]} delay={ROLL_DELAY_MS} />
          <View style={styles.ahead}>
            <MaterialCommunityIcons name="account-group-outline" size={24} color={colors.primaryDark} />
            <Text style={styles.aheadText}>{strings.hasToken.ahead(token.ahead)}</Text>
          </View>
        </View>

        <Perforation bleed={sizes.paperPadX} />

        <View style={styles.facts}>
          <Fact sizes={sizes} label={strings.ticket.doctor} value={visit.doctor.name} />
          <Fact sizes={sizes} label={strings.ticket.department} value={visit.doctor.department} />
          <Fact sizes={sizes} label={strings.ticket.room} value={token.room || visit.doctor.room} />
          <Fact sizes={sizes} label={strings.ticket.feePaid} value={strings.ticket.feePaidValue(visit.fee, method)}>
            {visit.sample ? (
              <View style={styles.sampleTag}>
                <Text style={styles.sampleTagText}>{strings.sample.badge}</Text>
              </View>
            ) : null}
          </Fact>
        </View>
      </View>
      <TornEdge />
    </View>
  );
}

function Fact({ label, value, sizes, children }: { label: string; value: string; sizes: TicketSizes; children?: ReactNode }) {
  return (
    <View style={[styles.fact, !sizes.factsTwoColumns && styles.factFull]}>
      <Text style={styles.caption}>{label}</Text>
      <View style={styles.factValueRow}>
        <Text style={[styles.factValue, { fontSize: sizes.factFont, lineHeight: sizes.factLine }]} numberOfLines={2}>
          {value}
        </Text>
        {children}
      </View>
    </View>
  );
}

/**
 * The ticket slides down out of a printer slot, like the paper slip (700 ms). With reduced motion
 * it fades in where it stands.
 */
function SlipOut({ children, stacked }: { children: ReactNode; stacked: boolean }) {
  const reduced = useReducedMotion();
  const height = useSharedValue(0);
  const out = useSharedValue(0);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    if (!measured) return;
    out.value = reduced ? withTiming(1, always(motion.duration.base)) : withDelay(SLIP_DELAY_MS, withTiming(1, { duration: SLIP_MS, easing: easeOut }));
  }, [measured, reduced, out]);

  const style = useAnimatedStyle(() =>
    reduced
      ? { opacity: out.value }
      : // Hidden until measured, then from fully inside the slot down to its place.
        { opacity: height.value > 0 ? 1 : 0, transform: [{ translateY: -(1 - out.value) * (height.value + SLOT_HEIGHT) }] },
  );

  const onLayout = (e: LayoutChangeEvent) => {
    height.value = e.nativeEvent.layout.height;
    setMeasured(true);
  };

  return (
    <View style={stacked ? styles.slipAreaStacked : styles.slipArea}>
      {/* No fixed height: the window is as tall as the slip. Only the slide-out above the slot is clipped. */}
      <View style={styles.slipWindow}>
        <Animated.View style={style} onLayout={onLayout}>
          {children}
        </Animated.View>
      </View>
      <View style={styles.slot} importantForAccessibility="no-hide-descendants">
        <View style={styles.slit} />
      </View>
    </View>
  );
}

/** A dashed tear line with a notch at each edge, like a ticket stub. */
function Perforation({ bleed }: { bleed: number }) {
  return (
    <View style={[styles.perforation, { marginHorizontal: -bleed }]} importantForAccessibility="no-hide-descendants">
      <Svg width="100%" height={2}>
        <Line x1={0} y1={1} x2="100%" y2={1} stroke={colors.borderDark} strokeWidth={2} strokeDasharray="8 7" />
      </Svg>
      <View style={[styles.notch, styles.notchStart]} />
      <View style={[styles.notch, styles.notchEnd]} />
    </View>
  );
}

const TEETH = 36;
const TEETH_PATH = `M0 0 ${Array.from({ length: TEETH }, (_, i) => `L${i * 20 + 10} 8 L${i * 20 + 20} 0`).join(' ')} Z`;

/** The torn bottom edge of the slip. */
function TornEdge() {
  return (
    <Svg width="100%" height={8} viewBox={`0 0 ${TEETH * 20} 8`} preserveAspectRatio="none">
      <Path d={TEETH_PATH} fill={colors.card} />
    </Svg>
  );
}

function PrintStatus({ status }: { status: SlipStatus }) {
  if (status === 'printing') {
    return (
      <Animated.View key={status} entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)} style={styles.printNote}>
        <PrintingIcon />
        <Text style={[styles.printText, { color: colors.primaryDark }]}>{strings.ticket.printing}</Text>
      </Animated.View>
    );
  }
  const look: { icon: IconName; text: string; ink: string } | null =
    status === 'printed'
      ? { icon: 'check-circle-outline', text: strings.ticket.printed, ink: colors.success }
      : status === 'failed' || status === 'no-printer'
        ? { icon: 'information-outline', text: strings.ticket.printFailed, ink: colors.warningText }
        : null;
  if (!look) return null;
  return (
    <Animated.View key={status} entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)} style={styles.printNote}>
      <MaterialCommunityIcons name={look.icon} size={30} color={look.ink} />
      <Text style={[styles.printText, { color: look.ink }]}>{look.text}</Text>
    </Animated.View>
  );
}

/** A printer with a sheet feeding out of it, over and over. Still with reduced motion. */
function PrintingIcon() {
  const reduced = useReducedMotion();
  const feed = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    feed.value = withRepeat(withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(feed);
  }, [reduced, feed]);
  const sheet = useAnimatedStyle(() => ({
    opacity: reduced ? 1 : feed.value < 0.8 ? 1 : (1 - feed.value) * 5,
    transform: [{ translateY: reduced ? 6 : -4 + 12 * Math.min(1, feed.value / 0.8) }],
  }));
  return (
    <View style={styles.printingIcon} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.sheet, sheet]}>
        <View style={styles.sheetLine} />
        <View style={[styles.sheetLine, styles.sheetLineShort]} />
      </Animated.View>
      <MaterialCommunityIcons name="printer" size={30} color={colors.primary} />
    </View>
  );
}

/** The 30 s back to Welcome, next to Done. Remounted (so restarted) on every touch. */
function ReturnRing({ onDone }: { onDone: () => void }) {
  const left = useCountdown(RETURN_SECONDS, onDone);
  return (
    <View accessible accessibilityLabel={strings.ticket.returning(left)}>
      <RingCountdown seconds={RETURN_SECONDS} size={68} strokeWidth={6}>
        <Text style={styles.ringNumber}>{left}</Text>
      </RingCountdown>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bannerIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successBright,
    boxShadow: '0px 6px 16px rgba(5, 150, 105, 0.26)',
  },
  bannerText: { flex: 1, gap: 2 },
  title: { ...typography.title, color: colors.success },
  subtitle: { ...typography.body, color: colors.textSecondary },

  body: { flexGrow: 1, flexDirection: 'row' },
  bodyStacked: { flexDirection: 'column', gap: spacing.md },

  slipArea: { flex: 1, minWidth: 0 },
  slipAreaStacked: { alignSelf: 'stretch' },
  slipWindow: {
    marginTop: SLOT_HEIGHT / 2,
    paddingHorizontal: SLIP_WINDOW_PAD,
    paddingBottom: spacing.md,
    overflow: 'hidden',
  },
  slot: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SLOT_HEIGHT,
    borderRadius: SLOT_HEIGHT / 2,
    backgroundColor: colors.navy,
    justifyContent: 'center',
    paddingHorizontal: 18,
    boxShadow: '0px 3px 8px rgba(15, 23, 42, 0.22)',
  },
  slit: { height: 4, borderRadius: 2, backgroundColor: '#020617' },

  paper: { boxShadow: shadows.card },
  paperBody: { backgroundColor: colors.card, paddingBottom: 18, gap: 14, overflow: 'hidden' },
  paperTop: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md },
  topCell: { flex: 1, gap: 2 },
  topCellEnd: { alignItems: 'flex-end' },
  caption: { ...typography.caption, color: colors.textTertiary },
  opNumber: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 30, color: colors.textPrimary, fontVariant: ['tabular-nums'], letterSpacing: 0.2 },
  when: { fontFamily: fonts.medium, fontSize: 20, lineHeight: 30, color: colors.textSecondary, fontVariant: ['tabular-nums'] },

  perforation: { height: 2, justifyContent: 'center' },
  notch: { position: 'absolute', top: -9, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.background },
  notchStart: { left: -10 },
  notchEnd: { right: -10 },

  tokenZone: { alignItems: 'center', gap: 2 },
  tokenCaption: { ...typography.label, color: colors.primaryDark },
  token: { ...typography.display, color: colors.primaryDark },
  ahead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.primaryLight,
  },
  aheadText: { ...typography.label, color: colors.primaryDark },

  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: 14 },
  fact: { width: '50%', gap: 2, paddingRight: spacing.md },
  factFull: { width: '100%', paddingRight: 0 },
  factValueRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  factValue: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28, color: colors.textPrimary, flexShrink: 1 },
  sampleTag: { backgroundColor: colors.warningLight, borderWidth: 1, borderColor: colors.warningBorder, borderRadius: radii.xs, paddingHorizontal: 8, paddingVertical: 2 },
  sampleTagText: { ...typography.small, color: colors.warningText },

  side: { gap: spacing.md, justifyContent: 'center' },
  sideStacked: { alignSelf: 'stretch' },
  qrCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  qrCardColumn: { flexDirection: 'column', gap: spacing.md },
  qrText: { flex: 1, gap: 6 },
  qrTextColumn: { flex: 0, alignSelf: 'stretch' },
  qrTitle: { ...typography.headline, fontSize: 24, lineHeight: 30, color: colors.textPrimary },
  qrBody: { ...typography.body, fontSize: 18, lineHeight: 25, color: colors.textSecondary },
  waitIcon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },

  cardNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.md,
    backgroundColor: colors.purpleLight,
  },
  cardNoteText: { ...typography.body, fontSize: 18, lineHeight: 24, fontFamily: fonts.medium, color: colors.purple, flex: 1 },

  printRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md, minHeight: tokenSizes.touchMin },
  printStatus: { flexGrow: 1, flexShrink: 1, minWidth: 160 },
  printNote: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  printText: { ...typography.label, flexShrink: 1 },
  printingIcon: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' },
  sheet: {
    position: 'absolute',
    bottom: 0,
    width: 14,
    height: 12,
    borderRadius: 2,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 2,
    paddingTop: 2,
    gap: 2,
  },
  sheetLine: { height: 1.5, backgroundColor: colors.primary, borderRadius: 1 },
  sheetLineShort: { width: '60%' },

  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  done: { flex: 1 },
  ringNumber: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 26, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
