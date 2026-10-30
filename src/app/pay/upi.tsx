import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { usePayWaiting } from '../../flow/usePayWaiting';
import { useFlow } from '../../flow/useFlow';
import { MAX_WAIT_SECONDS, payScreenGuard, secondsLeft } from '../../flow/visitPolling';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { colors, fonts, methodColors, radii, shadows, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { formatClock, useCountdown } from '../../ui/Countdown';
import { ClosedPanel, ReconnectNote } from '../../ui/PayParts';
import { copyType, heroType, upiSizes } from '../../ui/paySizing';
import { QrView } from '../../ui/QrView';
import { RingCountdown } from '../../ui/RingCountdown';
import { SampleStrip } from '../../ui/SampleStrip';
import { Screen } from '../../ui/Screen';
import { WaitingDots } from '../../ui/StatusPanel';
import { useLayout } from '../../ui/useLayout';
import { useKioskApp } from '../../store/useKioskApp';
import { rowShare } from '../../ui/layout';

/** Step 6, UPI: the QR inside a ring that empties as the order runs out. The server decides when it is paid. */
export default function PayUpi() {
  const visit = useFlow((s) => s.visit);
  // Only a missing or mismatched visit leaves; paid and closed outcomes belong to the screen below.
  const guard = payScreenGuard(visit, 'UPI');
  if (!visit || guard !== 'stay') return <Redirect href={guard === 'to-payment' ? '/payment' : '/'} />;
  return <UpiScreen key={visit.expiresAt} visitId={visit.id} upiUri={visit.upiUri} expiresAt={visit.expiresAt} fee={visit.fee} />;
}

function UpiScreen({ visitId, upiUri, expiresAt, fee }: { visitId: string; upiUri?: string; expiresAt: string; fee: number }) {
  const layout = useLayout();
  const skewMs = useKioskApp((s) => s.serverSkewMs);
  const sample = useKioskApp((s) => s.config?.sample.payments === true);
  const { closed, reconnecting, simulating, simulateFailed, simulate, chooseAnother } = usePayWaiting(visitId);
  // Fixed per order (the screen is keyed by it): a new value would restart the ring.
  const [seconds] = useState(() => secondsLeft(expiresAt, Date.now() + skewMs, MAX_WAIT_SECONDS.UPI));
  const left = useCountdown(seconds);

  if (closed) return <ClosedPanel status={closed.status} />;

  // The ring is sized from the window (see upiSizes); the QR's corners stay inside it.
  const { stacked, ring, stroke, qr, alignTop } = upiSizes(layout);
  const hero = heroType(layout);
  const copy = copyType(layout);
  const over = left === 0;

  return (
    <Screen>
      <View style={[styles.body, stacked && styles.bodyStacked, alignTop && styles.bodyTop]}>
      <Enter style={styles.ringSlot}>
        <RingCountdown seconds={seconds} total={MAX_WAIT_SECONDS.UPI} size={ring} strokeWidth={stroke} color={methodColors.UPI} trackColor="#D7F2E5">
          {upiUri ? <QrView value={upiUri} size={qr} accessibilityLabel={strings.upi.qrLabel(fee)} /> : null}
        </RingCountdown>
      </Enter>

      <View style={[styles.side, stacked ? styles.sideStacked : styles.sideBeside]}>
        <Enter index={1}>
          <Text style={[styles.title, hero, stacked && styles.titleStacked]} accessibilityRole="header">
            {strings.upi.title(fee)}
          </Text>
        </Enter>

        <Enter index={2} style={styles.steps}>
          {strings.upi.steps.map((step, i) => (
            <View key={step} style={styles.step}>
              <View style={styles.stepNo}>
                <Text style={styles.stepNoText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, copy]}>{step}</Text>
            </View>
          ))}
        </Enter>

        <Enter index={3} style={styles.status} >
          <View style={styles.waiting} accessibilityLiveRegion="polite">
            <WaitingDots color={methodColors.UPI} />
            <Text style={styles.waitingText}>{over ? strings.pay.checking : strings.pay.waiting}</Text>
          </View>
          <View style={styles.clock}>
            <Text style={styles.clockLabel}>{strings.pay.timeLeft}</Text>
            <Text style={styles.clockValue}>{formatClock(left)}</Text>
          </View>
          <ReconnectNote visible={reconnecting} />
        </Enter>

        <Enter index={4} style={styles.controls}>
          {sample ? (
            <>
              <SampleStrip text={strings.upi.sampleStrip} />
              <Button
                label={strings.upi.simulate}
                variant="success"
                icon="check-decagram"
                loading={simulating}
                disabled={simulating}
                onPress={simulate}
              />
              {simulateFailed ? <Text style={styles.simError}>{strings.pay.simulateFailed}</Text> : null}
            </>
          ) : null}
          <Button label={strings.pay.chooseAnother} variant="secondary" icon="swap-horizontal" disabled={simulating} onPress={chooseAnother} />
        </Enter>
      </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.xl },
  bodyStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.lg },
  bodyTop: { alignItems: 'flex-start' },
  ringSlot: { alignItems: 'center', justifyContent: 'center' },
  side: { gap: spacing.lg, justifyContent: 'center' },
  sideBeside: rowShare(),
  sideStacked: { gap: spacing.md },
  titleStacked: { textAlign: 'center' },
  title: { ...typography.hero, color: colors.textPrimary },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  stepNo: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#D7F2E5' },
  stepNoText: { fontFamily: fonts.bold, fontSize: 20, color: methodColors.UPI },
  stepText: { ...typography.bodyLarge, color: colors.textSecondary },
  status: { gap: 12 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  waitingText: { ...typography.label, color: colors.textPrimary, flexShrink: 1 },
  clock: { flexDirection: 'row', alignItems: 'baseline', gap: 12 },
  clockLabel: { ...typography.caption, color: colors.textSecondary },
  clockValue: { fontFamily: fonts.bold, fontSize: 34, lineHeight: 42, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  controls: { gap: 12 },
  simError: { ...typography.caption, color: colors.dangerStrong },
});
