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
import { colors, fonts, motion, radii, shadows, sizes, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from '../ui/Button';
import { RollingNumber } from '../ui/RollingNumber';
import { StepTitle } from '../ui/StepTitle';

/** The token rolls in once the panel has settled. */
const ROLL_DELAY_MS = 180;

/** One active token per patient per day: show the one they have, with no payment. */
export default function HasToken() {
  const token = useFlow((s) => s.activeToken);
  const patient = useFlow((s) => s.patient);
  const slip = useMemo(() => (token ? { token, patient } : null), [token, patient]);
  // Printed only when asked (Print slip); the button shows only where a printer is set up.
  const printer = usePrintSlip(slip);
  const printState = printer.status;
  const showPrint = printState === 'idle' || printState === 'printing' || printState === 'printed' || printState === 'failed';

  if (!token) return <Redirect href="/" />;

  const facts: { label: string; value: string }[] = [];
  if (token.doctorName) facts.push({ label: strings.hasToken.doctor, value: token.doctorName });
  if (token.department) facts.push({ label: strings.hasToken.department, value: token.department });
  if (token.room) facts.push({ label: strings.hasToken.room, value: token.room });

  return (
    <View style={styles.screen}>
      <StepTitle title={strings.hasToken.title} subtitle={strings.hasToken.subtitle(patient?.name)} />

      <Enter style={styles.card}>
        <View style={styles.tokenPanel}>
          <Text style={styles.tokenCaption}>{strings.hasToken.yourToken}</Text>
          <RollingNumber value={token.label} style={styles.token} delay={ROLL_DELAY_MS} />
          <Enter index={2} delay={ROLL_DELAY_MS}>
            <QueueStatus token={token} />
          </Enter>
        </View>

        <View style={styles.details}>
          {facts.map((fact, i) => (
            <Enter key={fact.label} index={i + 1} delay={ROLL_DELAY_MS} style={[styles.fact, i > 0 && styles.factRule]}>
              <Text style={styles.factLabel}>{fact.label}</Text>
              <Text style={styles.factValue} numberOfLines={2}>
                {fact.value}
              </Text>
            </Enter>
          ))}
        </View>
      </Enter>

      <Enter index={3} delay={ROLL_DELAY_MS} style={styles.actions}>
        <View style={styles.printNote}>
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
          style={styles.done}
        />
      </Enter>
    </View>
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
  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 1480,
    alignSelf: 'center',
    paddingHorizontal: sizes.screenGutter,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
  },
  card: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xl,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  tokenPanel: {
    width: 460,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  tokenCaption: { ...typography.label, color: colors.primaryDark },
  token: { ...typography.display, color: colors.primaryDark },
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
  details: { flex: 1, justifyContent: 'center', paddingRight: spacing.lg },
  fact: { gap: 4, paddingVertical: spacing.md },
  factRule: { borderTopWidth: 1, borderTopColor: colors.border },
  factLabel: { ...typography.caption, color: colors.textTertiary },
  factValue: { ...typography.headline, color: colors.textPrimary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  printNote: { flex: 1 },
  printNoteRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  printNoteText: { ...typography.body, fontFamily: fonts.medium, flexShrink: 1 },
  done: { minWidth: 240 },
});
