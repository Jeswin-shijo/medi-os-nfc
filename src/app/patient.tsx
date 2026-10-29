import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { Enter } from '../motion/Enter';
import { colors, fonts, motion, radii, shadows, sizes, spacing, typography } from '../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { StepTitle } from '../ui/StepTitle';

/** The details rise in after the avatar and the badge. */
const DETAILS_DELAY_MS = 220;

/** "Is this you?": the record the card (or the code) found, to confirm before choosing a doctor. */
export default function PatientFound() {
  const patient = useFlow((s) => s.patient);
  const appointment = useFlow((s) => s.appointmentToday);
  const reduced = useReducedMotion();

  if (!patient) return <Redirect href="/" />;

  const facts: { label: string; value: string }[] = [
    { label: strings.patient.ageSex, value: strings.patient.ageSexValue(patient.age, patient.gender) },
    { label: strings.patient.mobile, value: patient.phone },
  ];
  if (patient.lastVisit) facts.push({ label: strings.patient.lastVisit, value: patient.lastVisit });
  if (patient.lastDepartment) facts.push({ label: strings.patient.department, value: patient.lastDepartment });

  const avatarIn = reduced
    ? FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)
    : ZoomIn.springify()
        .damping(motion.spring.pop.damping)
        .stiffness(motion.spring.pop.stiffness)
        .mass(motion.spring.pop.mass)
        .withInitialValues({ transform: [{ scale: 0.4 }] });
  const badgeIn = reduced
    ? FadeIn.duration(motion.duration.base).delay(120).reduceMotion(ReduceMotion.Never)
    : FadeInLeft.duration(motion.duration.slow)
        .delay(120)
        .easing(easeOut)
        .withInitialValues({ opacity: 0, transform: [{ translateX: -24 }] });

  return (
    <View style={styles.screen}>
      <StepTitle title={strings.patient.title} subtitle={strings.patient.subtitle} />

      <Enter style={styles.card}>
        <View style={styles.identity}>
          <Animated.View entering={avatarIn}>
            <Avatar name={patient.name} size={120} />
          </Animated.View>
          <Animated.View entering={badgeIn} style={styles.badge} accessibilityRole="text">
            <MaterialCommunityIcons name="check-decagram" size={22} color={colors.success} />
            <Text style={styles.badgeText}>{strings.patient.identified}</Text>
          </Animated.View>
          <Enter index={1} delay={DETAILS_DELAY_MS - motion.stagger} style={styles.nameBlock}>
            <Text style={styles.name} numberOfLines={2} accessibilityRole="header">
              {patient.name}
            </Text>
            <Text style={styles.uhid}>{strings.patient.uhid(patient.uhid)}</Text>
          </Enter>
        </View>

        <View style={styles.divider} />

        <View style={styles.details}>
          <View style={styles.facts}>
            {facts.map((fact, i) => (
              <Enter key={fact.label} index={i} delay={DETAILS_DELAY_MS} style={styles.fact}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={styles.factValue} numberOfLines={1}>
                  {fact.value}
                </Text>
              </Enter>
            ))}
          </View>
          {appointment ? (
            <Enter index={facts.length} delay={DETAILS_DELAY_MS} style={styles.appointment}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={colors.primaryDark} />
              <Text style={styles.appointmentText}>{strings.patient.appointment(appointment.time)}</Text>
            </Enter>
          ) : null}
        </View>
      </Enter>

      <Enter index={2} delay={DETAILS_DELAY_MS} style={styles.actions}>
        <Button
          label={strings.patient.notMe}
          variant="secondary"
          size="large"
          icon="account-remove-outline"
          onPress={() => useFlow.getState().resetFlow()}
        />
        <Button
          label={strings.patient.continue}
          variant="success"
          size="large"
          icon="arrow-right"
          iconPosition="end"
          onPress={() => router.push('/department')}
          style={styles.continue}
        />
      </Enter>
    </View>
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
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  identity: { width: 400, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.accentLight,
  },
  badgeText: { ...typography.label, color: colors.success },
  nameBlock: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  name: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  uhid: { ...typography.label, fontFamily: fonts.medium, color: colors.textSecondary, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  divider: { width: 1, marginVertical: spacing.xl, backgroundColor: colors.border },
  details: { flex: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  fact: { width: '50%', paddingRight: spacing.lg, gap: 4 },
  factLabel: { ...typography.caption, color: colors.textTertiary },
  factValue: { ...typography.headline, fontFamily: fonts.medium, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  appointment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: radii.md,
    backgroundColor: colors.primaryLight,
  },
  appointmentText: { ...typography.bodyLarge, fontFamily: fonts.medium, color: colors.primaryDark, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  continue: { minWidth: 320 },
});
