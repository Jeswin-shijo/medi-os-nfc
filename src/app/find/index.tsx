import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { KioskApiError } from '../../api/client';
import { useFind } from '../../flow/useFind';
import { useRequestGuard } from '../../flow/useRequestGuard';
import { strings } from '../../i18n/strings';
import { isValidIndianMobile } from '../../lib/phone';
import { Enter } from '../../motion/Enter';
import { feedback } from '../../motion/feedback';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, motion, radii, shadows, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { ChoicePanel } from '../../ui/ChoicePanel';
import { NumberPad } from '../../ui/NumberPad';
import { PhoneField } from '../../ui/PhoneField';
import { Screen } from '../../ui/Screen';
import { padWidth, sideBySide } from '../../ui/sizing';
import { StepTitle } from '../../ui/StepTitle';
import { useShake } from '../../ui/Shake';
import { useLayout } from '../../ui/useLayout';
import { rowShare } from '../../ui/layout';

/** Find my record, step 1: the mobile number the hospital has on file. */
export default function FindMobile() {
  const api = useKioskApp((s) => s.api);
  const notice = useFind((s) => s.notice);
  const digits = useFind((s) => s.phone);
  const begin = useRequestGuard();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const inFlight = useRef(false);
  const { style: shakeStyle, shake } = useShake();
  const layout = useLayout();

  const valid = isValidIndianMobile(digits);
  const message = error ?? notice;

  // Entered fresh from Welcome: nobody else's number. Only the Register hand-off may bring one.
  useEffect(() => useFind.getState().enter(), []);

  const change = (next: string) => {
    useFind.getState().setPhone(next);
    useFind.getState().setNotice(null);
    setError(null);
  };

  const send = async () => {
    // One code per tap: a double tap must not send two SMS.
    if (!api || !valid || inFlight.current) return;
    inFlight.current = true;
    const stale = begin();
    setSending(true);
    setError(null);
    useFind.getState().setNotice(null);
    try {
      const result = await api.sendOtp(digits);
      if (stale()) return;
      if (!result.found) {
        setNotFound(true);
        return;
      }
      useFind.getState().setCode({ sampleCode: result.sampleCode, resendAfterSeconds: result.resendAfterSeconds });
      router.push('/find/otp');
    } catch (err) {
      // A removed kiosk key has already sent the kiosk to its setup screen.
      if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      feedback.error();
      shake();
      setError(err instanceof Error && err.message ? err.message : strings.errors.generic);
    } finally {
      inFlight.current = false;
      if (!stale()) setSending(false);
    }
  };

  if (notFound) {
    return (
      <Screen>
        <StepTitle title={strings.find.title} />
        <ChoicePanel
          icon="account-search-outline"
          title={strings.find.notFound.title}
          body={strings.find.notFound.body}
          primary={{
            label: strings.find.notFound.register,
            icon: 'account-plus-outline',
            onPress: () => {
              useFind.getState().handOff(digits);
              router.push('/register');
            },
          }}
          secondary={{
            label: strings.find.notFound.tryAnother,
            icon: 'cellphone-text',
            onPress: () => {
              change('');
              setNotFound(false);
            },
          }}
        />
      </Screen>
    );
  }

  // The number display above the pad on a phone upright or a small tablet; side by side where there is room.
  const beside = sideBySide(layout);
  const compact = layout.size === 'compact';

  return (
    <Screen>
      <StepTitle title={strings.find.title} subtitle={strings.find.subtitle} />
      <View style={[styles.body, !beside && styles.bodyStacked]}>
        <Enter index={1} style={[styles.entry, beside && styles.entryBeside, compact && styles.entryCompact]}>
          <Animated.View style={[styles.field, shakeStyle]}>
            <PhoneField digits={digits} />
          </Animated.View>
          <View style={styles.messageSlot}>{message ? <Message key={message} text={message} /> : null}</View>
          <Button
            label={sending ? strings.find.sending : strings.find.sendOtp}
            size="large"
            icon="message-text-outline"
            loading={sending}
            disabled={!valid}
            onPress={() => void send()}
          />
        </Enter>
        <Enter index={2} style={{ width: padWidth(layout), alignSelf: 'center' }}>
          <NumberPad
            disabled={sending}
            onDigit={(d) => change(digits.length < 10 ? digits + d : digits)}
            onBackspace={() => change(digits.slice(0, -1))}
            onClear={() => change('')}
          />
        </Enter>
      </View>
    </Screen>
  );
}

/** A calm amber line under the number: what the server said, in its own words. */
function Message({ text }: { text: string }) {
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
      exiting={FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)}
      style={styles.message}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons name="information-outline" size={26} color={colors.warningText} />
      <Text style={styles.messageText}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, flexDirection: 'row', gap: spacing.xl, alignItems: 'center' },
  bodyStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  entry: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  entryBeside: rowShare(),
  entryCompact: { padding: spacing.md },
  field: { alignSelf: 'stretch' },
  messageSlot: { minHeight: 56, justifyContent: 'center' },
  message: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: colors.warningLight,
    borderWidth: 1.5,
    borderColor: colors.warningBorder,
  },
  messageText: { ...typography.caption, fontSize: 18, lineHeight: 24, color: colors.warningText, flexShrink: 1 },
});
