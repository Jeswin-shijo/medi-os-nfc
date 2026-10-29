import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { IdentifyResult } from '../../api/types';
import { useFind } from '../../flow/useFind';
import { useFlow } from '../../flow/useFlow';
import { strings } from '../../i18n/strings';
import { Enter } from '../../motion/Enter';
import { PressableScale } from '../../motion/Pressable';
import { colors, fonts, radii, shadows, sizes, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../ui/Avatar';
import { Button } from '../../ui/Button';
import { StepTitle } from '../../ui/StepTitle';

/** Find my record, step 3 (only when several people share the number): who is visiting today? */
export default function FindChoose() {
  const candidates = useFind((s) => s.candidates);
  if (candidates.length === 0) return <Redirect href="/find" />;

  const pick = (result: IdentifyResult) => {
    useFlow.getState().setIdentity(result, 'otp');
    // Everyone else on the number is forgotten the moment one person is chosen.
    useFind.getState().setCandidates([]);
    router.push(result.activeToken ? '/has-token' : '/patient');
  };

  return (
    <View style={styles.screen}>
      <StepTitle title={strings.find.choose.title} subtitle={strings.find.choose.subtitle} />
      <ScrollView style={styles.list} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
        {candidates.map((result, i) => (
          <Enter key={result.session} index={i + 1}>
            <PersonRow result={result} onPress={() => pick(result)} />
          </Enter>
        ))}
      </ScrollView>
      <Enter index={candidates.length + 1} style={styles.actions}>
        <Button label={strings.find.choose.none} variant="secondary" size="large" icon="account-remove-outline" onPress={() => router.dismissTo('/find')} />
      </Enter>
    </View>
  );
}

function PersonRow({ result, onPress }: { result: IdentifyResult; onPress: () => void }) {
  const { patient } = result;
  const line = strings.patient.ageSexValue(patient.age, patient.gender);
  return (
    <PressableScale
      onPress={onPress}
      highlight="rgba(30, 107, 255, 0.07)"
      accessibilityLabel={`${patient.name}, ${line}, ${strings.find.choose.uhid(patient.uhid)}`}
      style={styles.row}
    >
      <Avatar name={patient.name} size={80} />
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {patient.name}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {line}
        </Text>
      </View>
      <Text style={styles.uhid}>{strings.find.choose.uhid(patient.uhid)}</Text>
      <MaterialCommunityIcons name="chevron-right" size={36} color={colors.textTertiary} />
    </PressableScale>
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
  list: { flex: 1 },
  listContent: { gap: spacing.md, paddingBottom: spacing.sm },
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
  text: { flex: 1, gap: 2 },
  name: { ...typography.headline, color: colors.textPrimary },
  meta: { ...typography.body, color: colors.textSecondary },
  uhid: { ...typography.label, fontFamily: fonts.medium, color: colors.textSecondary, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end' },
});
