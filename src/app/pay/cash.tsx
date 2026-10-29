import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { VisitView } from '../../api/types';
import { goPaid } from '../../flow/usePayWaiting';
import { useFlow } from '../../flow/useFlow';
import { useVisitPolling } from '../../flow/useVisitPolling';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { colors, fonts, methodColors, radii, shadows, sizes, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { ClosedPanel, ReconnectNote } from '../../ui/PayParts';
import { RollingNumber } from '../../ui/RollingNumber';
import { WaitingDots } from '../../ui/StatusPanel';

const MAX_CONTENT_WIDTH = 1480;
const BLUE = methodColors.CASH;

/** Step 6, cash: show the code at the counter. The visit stays open when the patient leaves this screen. */
export default function PayCash() {
  const visit = useFlow((s) => s.visit);
  if (!visit || visit.method !== 'CASH' || !visit.paymentCode || visit.status !== 'awaiting-payment') {
    return <Redirect href={visit ? '/payment' : '/'} />;
  }
  return <CashScreen visitId={visit.id} code={visit.paymentCode} fee={visit.fee} />;
}

function CashScreen({ visitId, code, fee }: { visitId: string; code: string; fee: number }) {
  const [closed, setClosed] = useState<VisitView | null>(null);
  const { reconnecting } = useVisitPolling(visitId, goPaid, (visit) => {
    useFlow.getState().setVisit(visit);
    setClosed(visit);
  });

  if (closed) return <ClosedPanel status={closed.status} />;

  return (
    <View style={styles.screen}>
      <Enter style={styles.card}>
        <Text style={styles.title} accessibilityRole="header">
          {strings.cash.title(fee)}
        </Text>

        <View style={styles.codeBox} accessible accessibilityLabel={strings.cash.codeLabel(code)}>
          <Text style={styles.codeCaption}>{strings.cash.showCode}</Text>
          <RollingNumber value={code} style={styles.code} delay={200} />
        </View>

        <View style={styles.go}>
          <MaterialCommunityIcons name="walk" size={32} color={BLUE} />
          <Text style={styles.goText}>{strings.cash.goNow}</Text>
        </View>

        <View style={styles.waiting} accessibilityLiveRegion="polite">
          <WaitingDots color={BLUE} />
          <Text style={styles.waitingText}>{strings.cash.waiting}</Text>
        </View>
        <ReconnectNote visible={reconnecting} />
      </Enter>

      <Enter index={3} style={styles.actions}>
        {/* Leaves the visit open for the counter: the reset never cancels a cash visit. */}
        <Button label={strings.cash.done} size="large" icon="check" onPress={() => useFlow.getState().resetFlow()} style={styles.done} />
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
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  card: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  title: { ...typography.hero, color: colors.textPrimary, textAlign: 'center' },
  codeBox: { alignItems: 'center', gap: 4, paddingHorizontal: 64, paddingVertical: 18, borderRadius: radii.lg, backgroundColor: '#EBF2FF', borderWidth: 2, borderColor: '#B9D0FF' },
  codeCaption: { ...typography.headline, color: colors.primaryDark },
  code: { fontFamily: fonts.bold, fontSize: 140, lineHeight: 156, letterSpacing: 16, color: colors.primaryDark },
  go: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 900 },
  goText: { ...typography.bodyLarge, color: colors.textSecondary, flexShrink: 1 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  waitingText: { ...typography.label, color: colors.textPrimary },
  actions: { alignItems: 'center' },
  done: { minWidth: 320 },
});
