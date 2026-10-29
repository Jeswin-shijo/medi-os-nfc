import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useReducedMotion, ZoomIn } from 'react-native-reanimated';
import { KioskApiError } from '../api/client';
import type { RegisterInput } from '../api/types';
import { useFind } from '../flow/useFind';
import { useFlow } from '../flow/useFlow';
import { useRequestGuard } from '../flow/useRequestGuard';
import { markActive } from '../flow/useInactivity';
import { strings } from '../i18n/strings';
import { MAX_AGE, parseDob } from '../lib/dob';
import { formatIndianMobile, isValidIndianMobile } from '../lib/phone';
import { Enter } from '../motion/Enter';
import { feedback } from '../motion/feedback';
import { PressableScale } from '../motion/Pressable';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Button, type IconName } from '../ui/Button';
import { ChoicePanel } from '../ui/ChoicePanel';
import { Screen } from '../ui/Screen';
import { contentWidth } from '../ui/sizing';
import { StepTitle } from '../ui/StepTitle';
import { useShake } from '../ui/Shake';
import { useLayout } from '../ui/useLayout';

type Gender = RegisterInput['gender'];
const GENDERS: { value: Gender; icon: IconName }[] = [
  { value: 'Male', icon: 'gender-male' },
  { value: 'Female', icon: 'gender-female' },
  { value: 'Other', icon: 'gender-non-binary' },
];

const digitsOnly = (text: string, max: number) => text.replace(/\D/g, '').slice(0, max);

/** New patient: the few facts the hospital needs to open a record. */
export default function Register() {
  const api = useKioskApp((s) => s.api);
  const [name, setName] = useState('');
  // Only the Find my record "not found" hand-off brings a number; a fresh start from Welcome is empty.
  const [phone, setPhone] = useState(() => (useFind.getState().handoff ? useFind.getState().phone : ''));
  const begin = useRequestGuard();
  useEffect(() => useFind.getState().enter(), []);
  const [gender, setGender] = useState<Gender | null>(null);
  const [byDob, setByDob] = useState(false);
  const [age, setAge] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecords, setHasRecords] = useState(false);
  const inFlight = useRef(false);
  const { style: shakeStyle, shake } = useShake();
  const layout = useLayout();
  const monthRef = useRef<TextInput>(null);
  const yearRef = useRef<TextInput>(null);

  const reduced = useReducedMotion();
  const swapIn = FadeIn.duration(reduced ? motion.duration.base : motion.duration.fast).reduceMotion(ReduceMotion.Never);

  const dob = byDob ? parseDob(day, month, year) : null;
  const ageNumber = age === '' ? null : Number(age);
  const ageOk = ageNumber !== null && ageNumber >= 0 && ageNumber <= MAX_AGE;
  const phoneOk = isValidIndianMobile(phone);
  const valid = name.trim().length >= 2 && phoneOk && gender !== null && (byDob ? dob !== null : ageOk);

  const edit = (apply: () => void) => {
    // Typing on the system keyboard is not a touch for the idle clock.
    markActive();
    setError(null);
    apply();
  };

  const submit = async (confirmNew: boolean) => {
    // One patient per tap: a double tap must not create two records.
    if (!api || !valid || !gender || inFlight.current) return;
    inFlight.current = true;
    const stale = begin();
    setBusy(true);
    setError(null);
    try {
      const result = await api.register({
        name: name.trim(),
        phone,
        gender,
        ...(byDob && dob ? { dob } : { age: ageNumber ?? undefined }),
        ...(confirmNew ? { confirmNew: true } : {}),
      });
      // Answered after the screen closed or the kiosk started over: do not sign the next person in.
      if (stale()) return;
      useFlow.getState().setIdentity(result, 'register');
      feedback.success();
      router.push('/department');
    } catch (err) {
      // A removed kiosk key has already sent the kiosk to its setup screen.
      if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      if (err instanceof KioskApiError && err.code === 'PHONE_HAS_RECORDS') {
        setHasRecords(true);
        return;
      }
      feedback.error();
      shake();
      setError(err instanceof Error && err.message ? err.message : strings.errors.generic);
    } finally {
      inFlight.current = false;
      if (!stale()) setBusy(false);
    }
  };

  if (hasRecords) {
    return (
      <Screen>
        <StepTitle title={strings.register.title} />
        <ChoicePanel
          icon="account-multiple-check-outline"
          title={strings.register.hasRecords.title}
          body={strings.register.hasRecords.body}
          primary={{
            label: strings.register.hasRecords.find,
            icon: 'cellphone-message',
            onPress: () => {
              useFind.getState().handOff(phone);
              router.replace('/find');
            },
          }}
          secondary={{
            label: strings.register.hasRecords.anyway,
            icon: 'account-plus-outline',
            onPress: () => {
              setHasRecords(false);
              void submit(true);
            },
          }}
        />
      </Screen>
    );
  }

  const compact = layout.size === 'compact';
  // Two cards side by side where there is room; one under the other on a phone upright or a small tablet.
  const twoColumns = contentWidth(layout) >= 720;
  const tight = compact || layout.short;
  // Taller fields and toggles where there is room; 60 and 72 dp keep the touch target on a phone.
  const inputSize = tight ? { height: 60, fontSize: 22, paddingHorizontal: 16 } : null;
  const prefixSize = tight ? { width: 72, height: 60 } : null;

  const phoneProblem = phone.length === 10 && !phoneOk;
  const dobProblem = byDob && day !== '' && month !== '' && year.length === 4 && dob === null;

  return (
    // Phones and small tablets show the keyboard over the form: the Screen scrolls and the form lifts above it.
    <KeyboardAvoidingView style={styles.avoid} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen>
        <StepTitle title={strings.register.title} subtitle={strings.register.subtitle} />

        <View style={[styles.form, !twoColumns && styles.formStacked]}>
          <Enter index={1} style={[styles.column, twoColumns && styles.columnBeside, compact && styles.columnCompact]}>
            <Field label={strings.register.name}>
              <TextInput
                style={[styles.input, inputSize]}
                value={name}
                onChangeText={(t) => edit(() => setName(t))}
                placeholder={strings.register.namePlaceholder}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={80}
                editable={!busy}
                accessibilityLabel={strings.register.name}
              />
            </Field>
            <Field label={strings.register.mobile} problem={phoneProblem ? strings.register.badMobile : undefined}>
              <View style={styles.phoneRow}>
                <View style={[styles.prefix, prefixSize]}>
                  <Text style={[styles.prefixText, tight && { fontSize: 22 }]}>{strings.find.prefix}</Text>
                </View>
                <TextInput
                  style={[styles.input, inputSize, styles.phoneInput, phoneProblem && styles.inputProblem]}
                  value={formatIndianMobile(phone)}
                  onChangeText={(t) => edit(() => setPhone(digitsOnly(t, 10)))}
                  placeholder={strings.register.mobilePlaceholder}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={11}
                  editable={!busy}
                  accessibilityLabel={strings.register.mobile}
                />
              </View>
            </Field>
          </Enter>

          <Enter index={2} style={[styles.column, twoColumns && styles.columnBeside, compact && styles.columnCompact]}>
            <Field label={strings.register.sex}>
              <View style={styles.sexRow}>
                {GENDERS.map((g) => (
                  <SexToggle
                    key={g.value}
                    label={strings.register.sexes[g.value]}
                    icon={g.icon}
                    selected={gender === g.value}
                    compact={tight}
                    disabled={busy}
                    onPress={() => edit(() => setGender(g.value))}
                  />
                ))}
              </View>
            </Field>

            <Field label={byDob ? strings.register.dob : strings.register.age} problem={dobProblem ? strings.register.badDob : undefined}>
              <Animated.View key={byDob ? 'dob' : 'age'} entering={swapIn}>
                {byDob ? (
                  <View style={styles.dobRow}>
                    <TextInput
                      style={[styles.input, inputSize, styles.dobInput]}
                      value={day}
                      onChangeText={(t) => {
                        edit(() => setDay(digitsOnly(t, 2)));
                        if (digitsOnly(t, 2).length === 2) monthRef.current?.focus();
                      }}
                      placeholder={strings.register.dayPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      editable={!busy}
                      accessibilityLabel={strings.register.day}
                    />
                    <TextInput
                      ref={monthRef}
                      style={[styles.input, inputSize, styles.dobInput]}
                      value={month}
                      onChangeText={(t) => {
                        edit(() => setMonth(digitsOnly(t, 2)));
                        if (digitsOnly(t, 2).length === 2) yearRef.current?.focus();
                      }}
                      placeholder={strings.register.monthPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      editable={!busy}
                      accessibilityLabel={strings.register.month}
                    />
                    <TextInput
                      ref={yearRef}
                      style={[styles.input, inputSize, styles.dobInput, styles.yearInput]}
                      value={year}
                      onChangeText={(t) => edit(() => setYear(digitsOnly(t, 4)))}
                      placeholder={strings.register.yearPlaceholder}
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      editable={!busy}
                      accessibilityLabel={strings.register.year}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={[styles.input, inputSize]}
                    value={age}
                    onChangeText={(t) => edit(() => setAge(digitsOnly(t, 3)))}
                    placeholder={strings.register.agePlaceholder}
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    editable={!busy}
                    accessibilityLabel={strings.register.age}
                  />
                )}
              </Animated.View>
              <Button
                label={byDob ? strings.register.ageInstead : strings.register.dobInstead}
                variant="quiet"
                icon={byDob ? 'numeric' : 'calendar-month-outline'}
                disabled={busy}
                onPress={() => edit(() => setByDob((v) => !v))}
                style={styles.toggle}
              />
            </Field>
          </Enter>
        </View>

        <Enter index={3} style={[styles.footer, compact && styles.footerStacked]}>
          <View style={[styles.errorSlot, compact && styles.errorSlotCompact]}>
            {error ? (
              <Animated.View entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)} style={styles.errorRow} accessibilityRole="alert" accessibilityLiveRegion="polite">
                <MaterialCommunityIcons name="alert-circle-outline" size={26} color={colors.dangerStrong} />
                <Text style={styles.errorText} numberOfLines={2}>
                  {error}
                </Text>
              </Animated.View>
            ) : null}
          </View>
          <Animated.View style={shakeStyle}>
            <Button
              label={busy ? strings.register.submitting : strings.register.submit}
              variant="success"
              size="large"
              icon="arrow-right"
              iconPosition="end"
              loading={busy}
              disabled={!valid}
              onPress={() => void submit(false)}
              style={compact ? undefined : styles.submit}
            />
          </Animated.View>
        </Enter>
      </Screen>
    </KeyboardAvoidingView>
  );
}

function Field({ label, problem, children }: { label: string; problem?: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {problem ? (
        <Text style={styles.problem} accessibilityRole="alert">
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

function SexToggle({ label, icon, selected, disabled, compact, onPress }: { label: string; icon: IconName; selected: boolean; disabled: boolean; compact: boolean; onPress: () => void }) {
  const reduced = useReducedMotion();
  const pop = reduced
    ? FadeIn.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)
    : ZoomIn.springify().damping(motion.spring.pop.damping).stiffness(motion.spring.pop.stiffness).mass(motion.spring.pop.mass).withInitialValues({ transform: [{ scale: 0.3 }] });
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      highlight="rgba(30, 107, 255, 0.08)"
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={[styles.sex, compact && styles.sexCompact, selected && styles.sexSelected]}
    >
      <MaterialCommunityIcons name={icon} size={compact ? 30 : 36} color={selected ? colors.primaryDark : colors.textTertiary} />
      <Text style={[styles.sexLabel, selected && styles.sexLabelSelected]}>{label}</Text>
      {selected ? (
        <Animated.View entering={pop} style={styles.tick}>
          <MaterialCommunityIcons name="check" size={18} color={colors.textOnColor} />
        </Animated.View>
      ) : null}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  avoid: { flex: 1 },
  form: { flexGrow: 1, flexDirection: 'row', gap: spacing.lg, alignItems: 'flex-start' },
  formStacked: { flexDirection: 'column', alignItems: 'stretch' },
  column: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  columnBeside: { flex: 1 },
  columnCompact: { gap: spacing.md, padding: spacing.md },
  field: { gap: 8 },
  label: { ...typography.label, color: colors.textSecondary },
  input: {
    height: 72,
    paddingHorizontal: 20,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
    fontFamily: fonts.medium,
    fontSize: 26,
    color: colors.textPrimary,
  },
  inputProblem: { borderColor: colors.dangerStrong },
  problem: { ...typography.caption, color: colors.dangerStrong },
  phoneRow: { flexDirection: 'row', gap: 12 },
  prefix: { width: 88, height: 72, borderRadius: radii.md, backgroundColor: colors.primaryLight, alignItems: 'center', justifyContent: 'center' },
  prefixText: { fontFamily: fonts.semibold, fontSize: 26, color: colors.primaryDark },
  phoneInput: { flex: 1, fontVariant: ['tabular-nums'], letterSpacing: 1 },
  sexRow: { flexDirection: 'row', gap: 12 },
  sex: {
    flex: 1,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  sexCompact: { height: 72 },
  sexSelected: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  sexLabel: { ...typography.label, color: colors.textSecondary },
  sexLabelSelected: { color: colors.primaryDark },
  tick: { position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  dobRow: { flexDirection: 'row', gap: 12 },
  dobInput: { flex: 1, textAlign: 'center', paddingHorizontal: 8, fontVariant: ['tabular-nums'] },
  yearInput: { flex: 1.6 },
  toggle: { alignSelf: 'flex-start', paddingHorizontal: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  footerStacked: { flexDirection: 'column', alignItems: 'stretch' },
  errorSlot: { flex: 1, minHeight: 56, justifyContent: 'center' },
  errorSlotCompact: { flex: 0, minHeight: 0 },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  errorText: { ...typography.label, color: colors.dangerStrong, flexShrink: 1 },
  submit: { minWidth: 380 },
});
