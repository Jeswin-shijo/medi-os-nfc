import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KioskApiError } from '../api/client';
import type { PaymentMethod, VisitView } from '../api/types';
import { goPaid } from '../flow/usePayWaiting';
import { useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { methodSlug } from '../flow/visitPolling';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { feedback } from '../motion/feedback';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, methodColors, radii, shadows, sizes, spacing, typography } from '../theme/tokens';
import { BigTile } from '../ui/BigTile';
import { Button, type IconName } from '../ui/Button';
import { ClosedPanel } from '../ui/PayParts';
import { RollingNumber } from '../ui/RollingNumber';
import { SampleStrip } from '../ui/SampleStrip';
import { StepTitle } from '../ui/StepTitle';

const MAX_CONTENT_WIDTH = 1480;

const METHODS: { method: PaymentMethod; flag: 'upi' | 'cash' | 'card'; icon: IconName; copy: { title: string; subtitle: string } }[] = [
  { method: 'UPI', flag: 'upi', icon: 'qrcode-scan', copy: strings.payment.upi },
  { method: 'CASH', flag: 'cash', icon: 'cash-multiple', copy: strings.payment.cash },
  { method: 'CARD', flag: 'card', icon: 'credit-card-outline', copy: strings.payment.card },
];

/** Step 5: how to pay. Choosing a way creates (or replaces) the payment order, then opens its screen. */
export default function Payment() {
  const api = useKioskApp((s) => s.api);
  const config = useKioskApp((s) => s.config);
  const session = useFlow((s) => s.session);
  const visit = useFlow((s) => s.visit);
  const patient = useFlow((s) => s.patient);
  const begin = useRequestGuard();
  const inFlight = useRef(false);
  const [pending, setPending] = useState<PaymentMethod | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [closed, setClosed] = useState<VisitView | null>(null);

  // Opening, and coming back from a payment screen with "Choose another method": nothing is pending.
  useFocusEffect(
    useCallback(() => {
      setPending(null);
      setError(null);
    }, []),
  );

  const choose = async (method: PaymentMethod) => {
    // One order per tap run: a second tap before the answer must not start another.
    if (!api || !visit || inFlight.current) return;
    inFlight.current = true;
    const stale = begin();
    setPending(method);
    setError(null);
    try {
      const ordered = await api.pay(visit.id, method);
      if (stale()) return;
      const ready = method === 'CASH' ? !!ordered.paymentCode : !!ordered.upiUri;
      if (ordered.status !== 'awaiting-payment' || !ready) {
        // The answer is not an order we can show: nothing is charged by this; try again.
        setPending(null);
        feedback.error();
        setError(strings.payment.tryAgain);
        return;
      }
      useFlow.getState().setVisit(ordered);
      router.push(`/pay/${methodSlug(method)}`);
    } catch (err) {
      if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      setPending(null);
      feedback.error();
      const code = err instanceof KioskApiError ? err.code : undefined;
      if (code === 'METHOD_OFF') {
        setError(strings.payment.methodOff);
      } else if (code === 'VISIT_CLOSED') {
        // Paid while the patient was choosing? Then go on; otherwise it is over.
        try {
          const latest = await api.visit(visit.id);
          if (stale()) return;
          useFlow.getState().setVisit(latest);
          if (latest.status === 'paid') goPaid(latest);
          else setClosed(latest);
        } catch (lookup) {
          if (stale() || (lookup instanceof KioskApiError && lookup.code === 'KIOSK_REVOKED')) return;
          setError(strings.payment.tryAgain);
        }
      } else if (code === 'SESSION_ENDED' || code === 'NETWORK') {
        setError(err instanceof Error && err.message ? err.message : strings.payment.tryAgain);
      } else {
        setError(strings.payment.tryAgain);
      }
    } finally {
      inFlight.current = false;
    }
  };

  if (!session || !visit) return <Redirect href="/" />;
  if (visit.status === 'paid') return <Redirect href="/paid" />;
  if (closed || visit.status === 'cancelled' || visit.status === 'expired') return <ClosedPanel status={(closed ?? visit).status} />;

  const enabled = METHODS.filter((m) => config?.methods[m.flag]);
  const sample = !!config?.sample.payments && enabled.some((m) => m.method !== 'CASH');

  if (enabled.length === 0) {
    return (
      <View style={styles.screen}>
        <Enter style={styles.none}>
          <MaterialCommunityIcons name="cash-register" size={64} color={colors.primaryDark} />
          <Text style={styles.noneTitle}>{strings.payment.none.title}</Text>
          <Text style={styles.noneBody}>{strings.payment.none.body}</Text>
          <Button label={strings.payment.none.done} size="large" icon="check" onPress={() => useFlow.getState().resetFlow()} />
        </Enter>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StepTitle title={strings.payment.title} subtitle={strings.payment.subtitle} />

      <Enter index={1} style={styles.summary}>
        <View style={styles.summaryIcon}>
          <MaterialCommunityIcons name="stethoscope" size={40} color={colors.primaryDark} />
        </View>
        <View style={styles.summaryText}>
          <Text style={styles.doctor} numberOfLines={1}>
            {strings.payment.doctorLine(visit.doctor.name, visit.doctor.department)}
          </Text>
          <Text style={styles.patient} numberOfLines={1}>
            {strings.payment.patient(patient?.name ?? visit.patient.name, patient?.uhid ?? visit.patient.uhid)}
          </Text>
        </View>
        <View style={styles.total} accessible accessibilityLabel={`${strings.payment.totalLabel} ${strings.payment.total(visit.fee)}`}>
          <Text style={styles.totalLabel}>{strings.payment.totalLabel}</Text>
          <RollingNumber value={strings.payment.total(visit.fee)} style={styles.totalValue} delay={160} />
        </View>
      </Enter>

      {error ? (
        <View style={styles.error} accessibilityRole="alert">
          <MaterialCommunityIcons name="alert-circle-outline" size={28} color={colors.dangerStrong} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.tiles}>
        {enabled.map((m, i) => (
          <Enter key={m.method} index={i + 2} style={styles.tileSlot}>
            <BigTile
              filled
              color={methodColors[m.method]}
              icon={m.icon}
              title={m.copy.title}
              subtitle={pending === m.method ? strings.payment.choosing : m.copy.subtitle}
              selected={pending === m.method}
              disabled={pending !== null && pending !== m.method}
              onPress={pending === null ? () => void choose(m.method) : undefined}
              style={styles.tile}
            />
          </Enter>
        ))}
      </View>

      {sample ? (
        <Enter index={5}>
          <SampleStrip text={strings.payment.sampleNote} />
        </Enter>
      ) : null}

      <Enter index={5} style={styles.actions}>
        <Button label={strings.payment.back} variant="quiet" icon="arrow-left" disabled={pending !== null} onPress={() => router.back()} />
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    paddingHorizontal: sizes.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  summary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: 24,
    paddingVertical: 18,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  summaryIcon: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryLight },
  summaryText: { flex: 1, gap: 2 },
  doctor: { ...typography.headline, color: colors.textPrimary },
  patient: { ...typography.body, color: colors.textSecondary },
  total: { alignItems: 'flex-end', gap: 0 },
  totalLabel: { ...typography.caption, color: colors.textSecondary },
  totalValue: { fontFamily: fonts.bold, fontSize: 52, lineHeight: 60, color: colors.primaryDark },
  error: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 12, borderRadius: radii.md, backgroundColor: colors.dangerLight },
  errorText: { ...typography.body, color: colors.dangerStrong, flexShrink: 1 },
  tiles: { flex: 1, flexDirection: 'row', gap: spacing.md },
  tileSlot: { flex: 1 },
  tile: { flex: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-start' },
  none: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  noneTitle: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  noneBody: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center', maxWidth: 640 },
});
