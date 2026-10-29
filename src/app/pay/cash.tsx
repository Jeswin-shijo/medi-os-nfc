import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { VisitView } from '../../api/types';
import { goPaid } from '../../flow/usePayWaiting';
import { useFlow } from '../../flow/useFlow';
import { useVisitPolling } from '../../flow/useVisitPolling';
import { payScreenGuard } from '../../flow/visitPolling';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { colors, fonts, methodColors, radii, shadows, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { cashSizes, copyType, heroType } from '../../ui/paySizing';
import { ClosedPanel, ReconnectNote } from '../../ui/PayParts';
import { RollingNumber } from '../../ui/RollingNumber';
import { Screen } from '../../ui/Screen';
import { contentWidth, fit } from '../../ui/sizing';
import { WaitingDots } from '../../ui/StatusPanel';
import { useLayout } from '../../ui/useLayout';

const BLUE = methodColors.CASH;

/** Step 6, cash: show the code at the counter. The visit stays open when the patient leaves this screen. */
export default function PayCash() {
  const visit = useFlow((s) => s.visit);
  // Only a missing or mismatched visit leaves; paid and closed outcomes belong to the screen below.
  const guard = payScreenGuard(visit, 'CASH');
  if (!visit || guard !== 'stay') return <Redirect href={guard === 'to-payment' ? '/payment' : '/'} />;
  return <CashScreen visitId={visit.id} code={visit.paymentCode ?? ''} fee={visit.fee} />;
}

function CashScreen({ visitId, code, fee }: { visitId: string; code: string; fee: number }) {
  const layout = useLayout();
  const [closed, setClosed] = useState<VisitView | null>(null);
  const { reconnecting } = useVisitPolling(visitId, goPaid, (visit) => {
    useFlow.getState().setVisit(visit);
    setClosed(visit);
  });

  if (closed) return <ClosedPanel status={closed.status} />;

  const compact = layout.size === 'compact';
  const sizes = cashSizes(layout, code.length || 6);
  const copy = copyType(layout);
  return (
    <Screen style={layout.size === 'expanded' ? styles.tabletGap : undefined}>
      <Enter style={[styles.card, { padding: sizes.cardPadding }, layout.short && styles.cardShort]}>
        <Text style={[styles.title, heroType(layout)]} accessibilityRole="header">
          {strings.cash.title(fee)}
        </Text>

        <View style={[styles.codeBox, { paddingHorizontal: sizes.codePaddingX }, compact && styles.codeBoxCompact]} accessible accessibilityLabel={strings.cash.codeLabel(code)}>
          <Text style={styles.codeCaption}>{strings.cash.showCode}</Text>
          <RollingNumber value={code} style={[styles.code, { fontSize: sizes.codeFont, lineHeight: sizes.codeLine, letterSpacing: sizes.codeSpacing }]} delay={200} />
        </View>

        <View style={styles.go}>
          <MaterialCommunityIcons name="walk" size={32} color={BLUE} />
          <Text style={[styles.goText, copy]}>{strings.cash.goNow}</Text>
        </View>

        <View style={styles.waiting} accessibilityLiveRegion="polite">
          <WaitingDots color={BLUE} />
          <Text style={styles.waitingText}>{strings.cash.waiting}</Text>
        </View>
        <ReconnectNote visible={reconnecting} />
      </Enter>

      <Enter index={3} style={styles.actions}>
        {/* Leaves the visit open for the counter: the reset never cancels a cash visit. */}
        <Button label={strings.cash.done} size="large" icon="check" onPress={() => useFlow.getState().resetFlow()} style={{ minWidth: fit(320, contentWidth(layout)) }} />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabletGap: { gap: spacing.md },
  card: {
    flexGrow: 1,
    minHeight: 320,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  title: { ...typography.hero, color: colors.textPrimary, textAlign: 'center' },
  cardShort: { gap: spacing.sm },
  codeBoxCompact: { paddingVertical: 12 },
  codeBox: { alignItems: 'center', gap: 4, paddingVertical: 18, borderRadius: radii.lg, backgroundColor: '#EBF2FF', borderWidth: 2, borderColor: '#B9D0FF' },
  codeCaption: { ...typography.headline, color: colors.primaryDark },
  code: { fontFamily: fonts.bold, color: colors.primaryDark },
  go: { flexDirection: 'row', alignItems: 'center', gap: 14, maxWidth: 900 },
  goText: { ...typography.bodyLarge, color: colors.textSecondary, flexShrink: 1 },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  waitingText: { ...typography.label, color: colors.textPrimary },
  actions: { alignItems: 'center' },
});
