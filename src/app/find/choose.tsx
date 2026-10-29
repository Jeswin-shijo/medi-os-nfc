import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { IdentifyResult } from '../../api/types';
import { useFind } from '../../flow/useFind';
import { useFlow } from '../../flow/useFlow';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { PressableScale } from '../../motion/Pressable';
import { colors, fonts, radii, shadows, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { Screen } from '../../ui/Screen';
import { StepTitle } from '../../ui/StepTitle';
import { useLayout } from '../../ui/useLayout';

/** Find my record, step 3 (only when several people share the number): who is visiting today? */
export default function FindChoose() {
  // Read once: choosing (or None of these) clears the store while this screen is still leaving.
  const [candidates] = useState(() => useFind.getState().candidates);
  const compact = useLayout().size === 'compact';
  if (candidates.length === 0) return <Redirect href="/find" />;

  const pick = (result: IdentifyResult) => {
    useFlow.getState().setIdentity(result, 'otp');
    // Everyone else on the number is forgotten the moment one person is chosen.
    useFind.getState().setCandidates([]);
    router.push(result.activeToken ? '/has-token' : '/patient');
  };

  const none = () => {
    // Not one of them: nothing of this number or its family stays on the screen.
    useFind.getState().clear();
    router.dismissTo('/find');
  };

  return (
    <Screen>
      <StepTitle title={strings.find.choose.title} subtitle={strings.find.choose.subtitle} />
      <View style={styles.list}>
        {candidates.map((result, i) => (
          <Enter key={result.session} index={i + 1}>
            <PersonRow result={result} onPress={() => pick(result)} />
          </Enter>
        ))}
      </View>
      <Enter index={candidates.length + 1} style={[styles.actions, compact && styles.actionsCompact]}>
        <Button label={strings.find.choose.none} variant="secondary" size="large" icon="account-remove-outline" onPress={none} />
      </Enter>
    </Screen>
  );
}

function PersonRow({ result, onPress }: { result: IdentifyResult; onPress: () => void }) {
  const { patient } = result;
  const compact = useLayout().size === 'compact';
  const line = strings.patient.ageSexValue(patient.age, patient.gender);
  return (
    <PressableScale
      onPress={onPress}
      highlight="rgba(30, 107, 255, 0.07)"
      accessibilityLabel={`${patient.name}, ${line}, ${strings.find.choose.uhid(patient.uhid)}`}
      style={[styles.row, compact && styles.rowCompact]}
    >
      <Avatar name={patient.name} size={compact ? 56 : 80} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {patient.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {line}
        </Text>
        {compact ? <Text style={styles.uhid}>{strings.find.choose.uhid(patient.uhid)}</Text> : null}
      </View>
      {compact ? null : <Text style={styles.uhid}>{strings.find.choose.uhid(patient.uhid)}</Text>}
      <MaterialCommunityIcons name="chevron-right" size={compact ? 28 : 36} color={colors.textTertiary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 1, gap: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    minHeight: 112,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  rowCompact: { gap: spacing.md, minHeight: 88, paddingHorizontal: 16, paddingVertical: 12 },
  text: { flex: 1, gap: 2 },
  name: { ...typography.headline, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  uhid: { ...typography.label, fontFamily: fonts.medium, color: colors.textSecondary, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionsCompact: { flexDirection: 'column' },
});
