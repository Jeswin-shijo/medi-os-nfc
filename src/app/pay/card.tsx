import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { usePayWaiting } from '../../flow/usePayWaiting';
import { useFlow } from '../../flow/useFlow';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, methodColors, radii, shadows, sizes, spacing, typography } from '../../theme/tokens';
import { withAlpha } from '../../theme/color';
import { Button } from '../../ui/Button';
import { ClosedPanel, ReconnectNote } from '../../ui/PayParts';
import { SampleStrip } from '../../ui/SampleStrip';
import { WaitingDots } from '../../ui/StatusPanel';

const MAX_CONTENT_WIDTH = 1480;
const PURPLE = methodColors.CARD;

/** Step 6, card: the machine does the work; this screen waits for its answer. */
export default function PayCard() {
  const visit = useFlow((s) => s.visit);
  if (!visit || visit.method !== 'CARD' || visit.status !== 'awaiting-payment') {
    return <Redirect href={visit ? '/payment' : '/'} />;
  }
  return <CardScreen visitId={visit.id} fee={visit.fee} />;
}

function CardScreen({ visitId, fee }: { visitId: string; fee: number }) {
  const sample = useKioskApp((s) => s.config?.sample.payments === true);
  const { closed, reconnecting, simulating, simulateFailed, simulate, chooseAnother } = usePayWaiting(visitId);

  if (closed) return <ClosedPanel status={closed.status} />;

  return (
    <View style={styles.screen}>
      <Enter style={styles.art}>
        <CardMachine />
      </Enter>

      <View style={styles.side}>
        <Enter index={1} style={styles.copy}>
          <Text style={styles.title} accessibilityRole="header">
            {strings.cardPay.title(fee)}
          </Text>
          <Text style={styles.instruction}>{strings.cardPay.instruction}</Text>
          <Text style={styles.hint}>{strings.cardPay.hint}</Text>
        </Enter>

        <Enter index={2} style={styles.status}>
          <View style={styles.waiting} accessibilityLiveRegion="polite">
            <WaitingDots color={PURPLE} />
            <Text style={styles.waitingText}>{strings.pay.waiting}</Text>
          </View>
          <ReconnectNote visible={reconnecting} />
        </Enter>

        <Enter index={3} style={styles.controls}>
          {sample ? (
            <>
              <SampleStrip text={strings.cardPay.sampleStrip} />
              <Button label={strings.cardPay.simulate} variant="success" icon="check-decagram" loading={simulating} disabled={simulating} onPress={simulate} />
              {simulateFailed ? <Text style={styles.simError}>{strings.pay.simulateFailed}</Text> : null}
            </>
          ) : null}
          <Button label={strings.pay.chooseAnother} variant="secondary" icon="swap-horizontal" disabled={simulating} onPress={chooseAnother} />
        </Enter>
      </View>
    </View>
  );
}

/** A card terminal drawn from icons: it breathes gently, and soft waves leave its screen. Still with reduced motion. */
function CardMachine() {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.quad) }), -1, true);
    return () => cancelAnimation(t);
  }, [reduced, t]);

  const body = useAnimatedStyle(() => ({ transform: [{ scale: reduced ? 1 : 1 + 0.025 * t.value }] }));
  const glow = useAnimatedStyle(() => ({ opacity: reduced ? 0.18 : 0.1 + 0.18 * t.value, transform: [{ scale: reduced ? 1 : 1 + 0.12 * t.value }] }));

  return (
    <View style={styles.machineBox} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[styles.glow, glow]} />
      <Animated.View style={[styles.machine, body]}>
        <View style={styles.machineScreen}>
          <MaterialCommunityIcons name="contactless-payment" size={84} color={PURPLE} />
        </View>
        <View style={styles.keys}>
          {Array.from({ length: 9 }, (_, i) => (
            <View key={i} style={styles.key} />
          ))}
        </View>
        <View style={styles.slot} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
    paddingHorizontal: sizes.screenGutter,
    paddingVertical: spacing.md,
  },
  art: { alignItems: 'center', justifyContent: 'center' },
  machineBox: { width: 440, height: 520, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', width: 420, height: 420, borderRadius: 210, backgroundColor: withAlpha(PURPLE, 0.25) },
  machine: {
    width: 250,
    height: 400,
    alignItems: 'center',
    gap: 18,
    paddingTop: 24,
    borderRadius: 36,
    backgroundColor: '#2B2150',
    boxShadow: shadows.lifted,
  },
  machineScreen: { width: 202, height: 130, alignItems: 'center', justifyContent: 'center', borderRadius: radii.md, backgroundColor: colors.purpleLight },
  keys: { width: 190, flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'center' },
  key: { width: 54, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.16)' },
  slot: { position: 'absolute', bottom: 18, width: 150, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.3)' },
  side: { flex: 1, gap: spacing.lg, justifyContent: 'center' },
  copy: { gap: 10 },
  title: { ...typography.hero, color: colors.textPrimary },
  instruction: { ...typography.headline, color: PURPLE },
  hint: { ...typography.bodyLarge, color: colors.textSecondary },
  status: { gap: 12 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingVertical: 14, borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  waitingText: { ...typography.label, color: colors.textPrimary, flexShrink: 1 },
  controls: { gap: 12 },
  simError: { ...typography.caption, color: colors.dangerStrong },
});
