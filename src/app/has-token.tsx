import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion } from 'react-native-reanimated';
import type { KioskTokenView } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { MAX_PRINTS, usePrintSlip } from '../printer/printSlip';
import { colors, fonts, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from '../ui/Button';
import { RollingNumber } from '../ui/RollingNumber';
import { Screen } from '../ui/Screen';
import { contentWidth, fit } from '../ui/sizing';
import { StepTitle } from '../ui/StepTitle';
import { useLayout } from '../ui/useLayout';

/** The token rolls in once the panel has settled. */
const ROLL_DELAY_MS = 180;

/** One active token per patient per day: show the one they have, with no payment. */
export default function HasToken() {
  const token = useFlow((s) => s.activeToken);
  const patient = useFlow((s) => s.patient);
  const slip = useMemo(() => (token ? { token, patient } : null), [token, patient]);
  // Printed only when asked (Print slip); the button shows only where a printer is set up.
  const layout = useLayout();
  const printer = usePrintSlip(slip);
  const printState = printer.status;
  const showPrint = printState === 'idle' || printState === 'printing' || printState === 'printed' || printState === 'failed';

  if (!token) return <Redirect href="/" />;

  const facts: { label: string; value: string }[] = [];
  if (token.doctorName) facts.push({ label: strings.hasToken.doctor, value: token.doctorName });
  if (token.department) facts.push({ label: strings.hasToken.department, value: token.department });
  if (token.room) facts.push({ label: strings.hasToken.room, value: token.room });

  const compact = layout.size === 'compact';
  const available = contentWidth(layout);
  // The token panel is 460 on a tablet, a share of the row on a small tablet, the full width on a phone upright.
  const panelWidth = fit(460, Math.round(available * 0.42));
  const tokenSize = compact ? 64 : layout.short ? 72 : 96;
  const buttonWidth = compact ? undefined : fit(240, Math.round(available * 0.3));

  return (
    <Screen>
      <StepTitle title={strings.hasToken.title} subtitle={strings.hasToken.subtitle(patient?.name)} />

      <Enter style={[styles.card, compact && styles.cardStacked, layout.short && styles.cardShort]}>
        <View style={[styles.tokenPanel, compact ? styles.tokenPanelStacked : { width: panelWidth }]}>
          <Text style={styles.tokenCaption}>{strings.hasToken.yourToken}</Text>
          <RollingNumber value={token.label} style={[styles.token, { fontSize: tokenSize, lineHeight: Math.round(tokenSize * 1.125) }]} delay={ROLL_DELAY_MS} />
          <Enter index={2} delay={ROLL_DELAY_MS}>
            <QueueStatus token={token} />
          </Enter>
        </View>

        <View style={[styles.details, compact && styles.detailsStacked]}>
          {facts.map((fact, i) => (
            <Enter key={fact.label} index={i + 1} delay={ROLL_DELAY_MS} style={[styles.fact, i > 0 && styles.factRule]}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={[styles.factValue, compact && styles.factValueCompact]} numberOfLines={2}>
                {fact.value}
              </Text>
            </Enter>
          ))}
        </View>
      </Enter>

      <Enter index={3} delay={ROLL_DELAY_MS} style={[styles.actions, compact && styles.actionsStacked]}>
        <View style={[styles.printNote, compact && styles.printNoteStacked]}>
          {printState === 'printed' || printState === 'failed' ? <PrintNote state={printState} /> : null}
        </View>
        {showPrint ? (
          <Button
            label={printer.used > 0 ? strings.hasToken.printAgain : strings.hasToken.print}
            variant="secondary"
            size="large"
            icon="printer-outline"
            loading={printState === 'printing'}
            disabled={printer.used >= MAX_PRINTS}
            onPress={printer.print}
          />
        ) : null}
        <Button
          label={strings.hasToken.done}
          size="large"
          icon="check"
          onPress={() => useFlow.getState().resetFlow()}
          style={{ minWidth: buttonWidth }}
        />
      </Enter>
    </Screen>
  );
}

/** Where the patient stands: people ahead, called now, or missed. */
function QueueStatus({ token }: { token: KioskTokenView }) {
  const look: { icon: IconName; text: string; ink: string; wash: string } =
    token.status === 'called'
      ? { icon: 'bullhorn-outline', text: strings.hasToken.called, ink: colors.success, wash: colors.accentLight }
      : token.status === 'skipped'
        ? { icon: 'alert-circle-outline', text: strings.hasToken.skipped, ink: colors.warningText, wash: colors.warningLight }
        : { icon: 'account-group-outline', text: strings.hasToken.ahead(token.ahead), ink: colors.primaryDark, wash: colors.card };
  return (
    <View style={[styles.status, { backgroundColor: look.wash }]}>
      <MaterialCommunityIcons name={look.icon} size={26} color={look.ink} />
      <Text style={[styles.statusText, { color: look.ink }]}>{look.text}</Text>
    </View>
  );
}

function PrintNote({ state }: { state: 'printed' | 'failed' }) {
  const printed = state === 'printed';
  return (
    <Animated.View
      key={state}
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
      style={styles.printNoteRow}
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons
        name={printed ? 'check-circle-outline' : 'information-outline'}
        size={26}
        color={printed ? colors.success : colors.warningText}
      />
      <Text style={[styles.printNoteText, { color: printed ? colors.success : colors.warningText }]}>
        {printed ? strings.hasToken.printed : strings.hasToken.printFailed}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexDirection: 'row',
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  cardStacked: { flexDirection: 'column', gap: spacing.md, padding: spacing.md },
  cardShort: { gap: spacing.lg, padding: spacing.md },
  tokenPanel: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  tokenPanelStacked: { alignSelf: 'stretch', padding: spacing.md },
  tokenCaption: { ...typography.label, color: colors.primaryDark },
  token: { fontFamily: typography.display.fontFamily, letterSpacing: typography.display.letterSpacing, color: colors.primaryDark },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: radii.md,
  },
  statusText: { ...typography.label, fontSize: 20, lineHeight: 26, flexShrink: 1 },
  details: { flexGrow: 1, flexShrink: 1, justifyContent: 'center', paddingRight: spacing.lg },
  detailsStacked: { paddingRight: spacing.xs },
  fact: { gap: 4, paddingVertical: spacing.md },
  factRule: { borderTopWidth: 1, borderTopColor: colors.border },
  factLabel: { ...typography.caption, color: colors.textTertiary },
  factValue: { ...typography.headline, color: colors.textPrimary },
  factValueCompact: { fontSize: 22, lineHeight: 28 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionsStacked: { flexDirection: 'column-reverse', alignItems: 'stretch' },
  printNote: { flex: 1 },
  printNoteStacked: { flex: 0 },
  printNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  printNoteText: { ...typography.body, fontFamily: fonts.medium, flexShrink: 1 },
});
