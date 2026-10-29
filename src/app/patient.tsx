import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { easeOut } from '../motion/curves';
import { Enter } from '../motion/Enter';
import { colors, fonts, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Screen } from '../ui/Screen';
import { contentWidth, fit } from '../ui/sizing';
import { StepTitle } from '../ui/StepTitle';
import { useLayout } from '../ui/useLayout';

/** The details rise in after the avatar and the badge. */
const DETAILS_DELAY_MS = 220;

/** "Is this you?": the record the card (or the code) found, to confirm before choosing a doctor. */
export default function PatientFound() {
  const patient = useFlow((s) => s.patient);
  const appointment = useFlow((s) => s.appointmentToday);
  const reduced = useReducedMotion();
  const layout = useLayout();

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

  const compact = layout.size === 'compact';
  const small = compact || layout.short;
  const available = contentWidth(layout);
  // A phone upright stacks the identity above the facts, and the actions go full width with Continue first.
  const identityWidth = fit(400, Math.round(available * 0.4));
  const factSize = compact ? { fontSize: layout.type.subtitle + 2, lineHeight: 26 } : null;

  return (
    <Screen>
      <StepTitle title={strings.patient.title} subtitle={strings.patient.subtitle} />

      <Enter style={[styles.card, compact && styles.cardStacked]}>
        <View style={[styles.identity, compact ? styles.identityStacked : { width: identityWidth }, small && styles.identitySmall]}>
          <Animated.View entering={avatarIn}>
            <Avatar name={patient.name} size={small ? 88 : 120} />
          </Animated.View>
          <Animated.View entering={badgeIn} style={styles.badge} accessibilityRole="text">
            <MaterialCommunityIcons name="check-decagram" size={22} color={colors.success} />
            <Text style={styles.badgeText}>{strings.patient.identified}</Text>
          </Animated.View>
          <Enter index={1} delay={DETAILS_DELAY_MS - motion.stagger} style={styles.nameBlock}>
            <Text style={[styles.name, compact && styles.nameCompact]} numberOfLines={2} accessibilityRole="header">
              {patient.name}
            </Text>
            <Text style={styles.uhid}>{strings.patient.uhid(patient.uhid)}</Text>
          </Enter>
        </View>

        <View style={compact ? styles.dividerStacked : styles.divider} />

        <View style={[styles.details, small && styles.detailsSmall]}>
          <View style={styles.facts}>
            {facts.map((fact, i) => (
              <Enter key={fact.label} index={i} delay={DETAILS_DELAY_MS} style={[styles.fact, compact && styles.factFull]}>
                <Text style={styles.factLabel}>{fact.label}</Text>
                <Text style={[styles.factValue, factSize]} numberOfLines={1}>
                  {fact.value}
                </Text>
              </Enter>
            ))}
          </View>
          {appointment ? (
            <Enter index={facts.length} delay={DETAILS_DELAY_MS} style={[styles.appointment, compact && styles.appointmentCompact]}>
              <MaterialCommunityIcons name="calendar-clock" size={28} color={colors.primaryDark} />
              <Text style={styles.appointmentText}>{strings.patient.appointment(appointment.time)}</Text>
            </Enter>
          ) : null}
        </View>
      </Enter>

      <Enter index={2} delay={DETAILS_DELAY_MS} style={[styles.actions, compact && styles.actionsStacked]}>
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
          style={{ minWidth: fit(320, Math.round(available * 0.55)) }}
        />
      </Enter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    flexGrow: 1,
    flexDirection: 'row',
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  cardStacked: { flexDirection: 'column' },
  identity: { alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  identityStacked: { alignSelf: 'stretch', padding: spacing.lg },
  identitySmall: { gap: spacing.sm, padding: spacing.md },
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
  nameCompact: { fontSize: 26, lineHeight: 32 },
  nameBlock: { alignItems: 'center', gap: 4, alignSelf: 'stretch' },
  name: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  uhid: { ...typography.label, fontFamily: fonts.medium, color: colors.textSecondary, fontVariant: ['tabular-nums'], letterSpacing: 0.4 },
  divider: { width: 1, marginVertical: spacing.xl, backgroundColor: colors.border },
  dividerStacked: { height: 1, marginHorizontal: spacing.lg, backgroundColor: colors.border },
  detailsSmall: { gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.md },
  details: { flexGrow: 1, flexShrink: 1, justifyContent: 'center', gap: spacing.lg, paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  facts: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  factFull: { width: '100%' },
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
  appointmentCompact: { paddingHorizontal: 14, paddingVertical: 12, gap: 10 },
  appointmentText: { ...typography.bodyLarge, fontFamily: fonts.medium, color: colors.primaryDark, flexShrink: 1 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.md },
  // Continue first, under the thumb, when the buttons stack.
  actionsStacked: { flexDirection: 'column-reverse', justifyContent: 'flex-start' },
});
