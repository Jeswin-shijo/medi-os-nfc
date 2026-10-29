import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useFlow } from '../flow/useFlow';
import { useTokenWait } from '../flow/useTokenWait';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { feedback } from '../motion/feedback';
import { colors, fonts, radii, shadows, sizes, spacing, typography } from '../theme/tokens';
import { Button } from '../ui/Button';
import { CheckBurst } from '../ui/CheckBurst';
import { SampleStrip } from '../ui/SampleStrip';
import { WaitingDots } from '../ui/StatusPanel';

const MAX_CONTENT_WIDTH = 1480;
/** The success moment is shown this long before the ticket takes over (Continue goes sooner). */
const SHOW_MS = 3000;
/** Details rise in once the check has drawn itself. */
const DETAILS_DELAY_MS = 450;

/** Step 7: payment received. Never pays again: it only reads the visit until the token is there. */
export default function Paid() {
  const visit = useFlow((s) => s.visit);
  const wait = useTokenWait();
  const advanced = useRef(false);
  const [shown, setShown] = useState(false);
  const paid = visit?.status === 'paid';

  useEffect(() => {
    if (!paid) return;
    feedback.success();
    const timer = setTimeout(() => setShown(true), SHOW_MS);
    return () => clearTimeout(timer);
  }, [paid]);

  const advance = () => {
    if (advanced.current) return;
    advanced.current = true;
    router.replace('/ticket');
  };

  // Auto-advance: the success moment has been shown and the token is there.
  useEffect(() => {
    if (shown && wait === 'ready') advance();
  }, [shown, wait]);

  if (!visit) return <Redirect href="/" />;
  if (!paid) return <Redirect href="/payment" />;

  const rows: { label: string; value: string }[] = [];
  if (visit.transactionId) rows.push({ label: strings.paid.transaction, value: visit.transactionId });
  rows.push({ label: strings.paid.amount, value: strings.payment.total(visit.fee) });
  if (visit.method) rows.push({ label: strings.paid.mode, value: strings.paid.modes[visit.method] });
  if (visit.paidAtDisplay) rows.push({ label: strings.paid.when, value: visit.paidAtDisplay });

  return (
    <View style={styles.screen}>
      <View style={styles.hero}>
        <CheckBurst size={280} />
        <Enter delay={DETAILS_DELAY_MS - 150} style={styles.heroText}>
          <Text style={styles.title} accessibilityRole="header" accessibilityLiveRegion="polite">
            {strings.paid.title}
          </Text>
          <Text style={styles.subtitle}>{wait === 'gave-up' ? strings.paid.noToken : strings.paid.subtitle}</Text>
        </Enter>
      </View>

      <View style={styles.side}>
        <Enter delay={DETAILS_DELAY_MS} style={styles.card}>
          {rows.map((row, i) => (
            <Enter key={row.label} index={i + 1} delay={DETAILS_DELAY_MS} style={[styles.row, i > 0 && styles.rowRule]}>
              <Text style={styles.rowLabel}>{row.label}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {row.value}
              </Text>
            </Enter>
          ))}
        </Enter>

        {visit.sample ? (
          <Enter delay={DETAILS_DELAY_MS} index={5}>
            <SampleStrip text={strings.paid.sample} />
          </Enter>
        ) : null}

        <Enter delay={DETAILS_DELAY_MS} index={6} style={styles.actions}>
          {wait === 'gave-up' ? (
            <View style={styles.desk}>
              <MaterialCommunityIcons name="account-tie-outline" size={32} color={colors.warningText} />
              <Text style={styles.deskText}>{strings.paid.noToken}</Text>
            </View>
          ) : wait === 'waiting' ? (
            <View style={styles.getting} accessibilityLiveRegion="polite">
              <WaitingDots />
              <Text style={styles.gettingText}>{strings.paid.gettingToken}</Text>
            </View>
          ) : null}
          {wait === 'gave-up' ? (
            <Button label={strings.paid.done} size="large" icon="check" onPress={() => useFlow.getState().resetFlow()} />
          ) : (
            <Button
              label={strings.paid.continue}
              size="large"
              variant="success"
              icon="arrow-right"
              iconPosition="end"
              loading={wait === 'waiting'}
              onPress={advance}
            />
          )}
        </Enter>
      </View>
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
  hero: { flex: 1, alignItems: 'center', gap: spacing.md },
  heroText: { alignItems: 'center', gap: 6 },
  title: { ...typography.hero, color: colors.success, textAlign: 'center' },
  subtitle: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center', maxWidth: 480 },
  side: { flex: 1, gap: spacing.md, justifyContent: 'center' },
  card: { borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card, paddingHorizontal: 28, paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, minHeight: 68 },
  rowRule: { borderTopWidth: 1, borderTopColor: colors.border },
  rowLabel: { ...typography.body, color: colors.textSecondary },
  rowValue: { fontFamily: fonts.semibold, fontSize: 24, lineHeight: 32, color: colors.textPrimary, fontVariant: ['tabular-nums'], flexShrink: 1, textAlign: 'right' },
  actions: { gap: spacing.md },
  getting: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  gettingText: { ...typography.label, color: colors.textSecondary },
  desk: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: radii.md, backgroundColor: colors.warningLight, borderWidth: 1.5, borderColor: colors.warningBorder },
  deskText: { ...typography.label, color: colors.warningText, flexShrink: 1 },
});
