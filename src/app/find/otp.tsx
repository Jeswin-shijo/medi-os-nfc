import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect, router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import { KioskApiError } from '../../api/client';
import type { IdentifyResult } from '../../api/types';
import { useFind } from '../../flow/useFind';
import { useFlow } from '../../flow/useFlow';
import { useRequestGuard } from '../../flow/useRequestGuard';
import { strings } from '../../i18n/strings';
import { formatIndianMobile } from '../../lib/phone';
import { Enter } from '../../motion/Enter';
import { feedback } from '../../motion/feedback';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, motion, radii, shadows, sizes, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';
import { useCountdown } from '../../ui/Countdown';
import { NumberPad } from '../../ui/NumberPad';
import { OtpBoxes, type OtpStatus } from '../../ui/OtpBoxes';
import { RingCountdown } from '../../ui/RingCountdown';
import { SampleStrip } from '../../ui/SampleStrip';
import { Screen } from '../../ui/Screen';
import { padWidth, sideBySide } from '../../ui/sizing';
import { StepTitle } from '../../ui/StepTitle';
import { useLayout } from '../../ui/useLayout';
import { rowShare } from '../../ui/layout';

const CODE_LENGTH = 6;
/** The boxes stay green this long before the next screen slides in. */
const SUCCESS_HOLD_MS = 550;
/** A wrong code stays red (and shaken) this long, then the boxes clear for another go. */
const ERROR_HOLD_MS = 700;

type Timer = ReturnType<typeof setTimeout> | undefined;

/** Where one identified patient goes next: their token, or straight on to confirm who they are. */
const nextRoute = (result: IdentifyResult) => (result.activeToken ? '/has-token' : '/patient');

/** Find my record, step 2: the 6-digit code sent to the phone. */
export default function FindOtp() {
  const api = useKioskApp((s) => s.api);
  const sampleSms = useKioskApp((s) => s.config?.sample.sms === true);
  // Read once: Change mobile number clears the store, and this screen is only leaving then.
  const [phone] = useState(() => useFind.getState().phone);
  const begin = useRequestGuard();
  const sampleCode = useFind((s) => s.sampleCode);
  const initialWait = useFind((s) => s.resendAfterSeconds);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<OtpStatus>('idle');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [resendNote, setResendNote] = useState<string | null>(null);
  const [wait, setWait] = useState(initialWait);
  const [round, setRound] = useState(0);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);
  const inFlight = useRef(false);
  const timer = useRef<Timer>(undefined);
  const layout = useLayout();

  useEffect(() => () => clearTimeout(timer.current), []);

  const verify = useCallback(
    async (entered: string) => {
      // One check at a time: the last digit tapped twice must not verify twice.
      if (!api || inFlight.current) return;
      inFlight.current = true;
      const stale = begin();
      setBusy(true);
      setProblem(null);
      setResendNote(null);
      try {
        const { patients } = await api.verifyOtp(phone, entered);
        // Answered after the screen closed or the kiosk started over: it belongs to nobody now.
        if (stale()) return;
        if (patients.length === 0) throw new KioskApiError(strings.errors.generic, 200, 'HTTP');
        setStatus('success');
        feedback.success();
        timer.current = setTimeout(() => {
          if (stale()) return;
          if (patients.length === 1) {
            useFlow.getState().setIdentity(patients[0]!, 'otp');
            router.push(nextRoute(patients[0]!));
          } else {
            useFind.getState().setCandidates(patients);
            router.push('/find/choose');
          }
        }, SUCCESS_HOLD_MS);
      } catch (err) {
        // A removed kiosk key has already sent the kiosk to its setup screen.
        if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
        if (err instanceof KioskApiError && err.code === 'OTP_EXPIRED') {
          // Back to the mobile number screen, which says so and lets them ask again.
          useFind.getState().setNotice(err.message || strings.find.otp.expired);
          router.back();
          return;
        }
        const wrong = err instanceof KioskApiError && err.code === 'OTP_WRONG';
        const attempts = wrong && typeof err.data?.attemptsLeft === 'number' ? err.data.attemptsLeft : undefined;
        setStatus('error');
        feedback.error();
        setProblem(wrong ? strings.find.otp.wrong(attempts) : err instanceof Error && err.message ? err.message : strings.errors.generic);
        timer.current = setTimeout(() => {
          setCode('');
          setStatus('idle');
        }, ERROR_HOLD_MS);
      } finally {
        inFlight.current = false;
        if (!stale()) setBusy(false);
      }
    },
    [api, phone, begin],
  );

  const resend = async () => {
    if (!api || inFlight.current) return;
    inFlight.current = true;
    const stale = begin();
    setResending(true);
    setProblem(null);
    try {
      const result = await api.sendOtp(phone);
      if (stale()) return;
      useFind.getState().setCode({ sampleCode: result.sampleCode, resendAfterSeconds: result.resendAfterSeconds });
      restartCountdown(result.resendAfterSeconds);
      setCode('');
      setStatus('idle');
      setResendNote(strings.find.otp.resent);
    } catch (err) {
      if (stale() || (err instanceof KioskApiError && err.code === 'KIOSK_REVOKED')) return;
      feedback.error();
      setProblem(err instanceof Error && err.message ? err.message : strings.errors.generic);
      // "Please wait 12 seconds": the server says how long.
      if (err instanceof KioskApiError && err.code === 'OTP_WAIT' && typeof err.data?.resendAfterSeconds === 'number') {
        restartCountdown(err.data.resendAfterSeconds);
      }
    } finally {
      inFlight.current = false;
      if (!stale()) setResending(false);
    }
  };

  const changeNumber = () => {
    // Leaving this number behind: the next screen starts empty.
    useFind.getState().clear();
    router.back();
  };

  const restartCountdown = (seconds: number) => {
    setWait(Math.max(1, Math.ceil(seconds)));
    setRound((n) => n + 1);
    setCanResend(false);
  };

  if (!phone) return <Redirect href="/find" />;

  const locked = busy || status !== 'idle';
  const addDigit = (digit: string) => {
    if (locked || code.length >= CODE_LENGTH) return;
    const next = code + digit;
    setCode(next);
    setResendNote(null);
    setProblem(null);
    if (next.length === CODE_LENGTH) void verify(next);
  };
  const shown = formatIndianMobile(phone);

  const beside = sideBySide(layout);
  const compact = layout.size === 'compact';

  return (
    <Screen>
      <StepTitle title={strings.find.otp.title} subtitle={strings.find.otp.sent(shown)} />
      <View style={[styles.body, !beside && styles.bodyStacked]}>
        <Enter index={1} style={[styles.panel, beside && styles.panelBeside, compact && styles.panelCompact]}>
          <OtpBoxes value={code} length={CODE_LENGTH} status={status} />

          <View style={styles.messageSlot}>
            {busy && status === 'idle' ? <Line key="busy" tone="info" icon="shield-check-outline" text={strings.find.otp.verifying} /> : null}
            {problem ? <Line key={problem} tone="warn" icon="alert-circle-outline" text={problem} /> : null}
            {!problem && resendNote && !busy ? <Line key={resendNote} tone="ok" icon="check-circle-outline" text={resendNote} /> : null}
          </View>

          {sampleSms && sampleCode ? <SampleStrip text={strings.find.otp.sampleCode(sampleCode)} /> : null}

          <View style={[styles.resendRow, compact && styles.resendRowCompact]}>
            {canResend ? (
              <Button
                label={resending ? strings.find.otp.resending : strings.find.otp.resend}
                variant="secondary"
                icon="message-text-outline"
                loading={resending}
                disabled={busy}
                onPress={() => void resend()}
              />
            ) : (
              <ResendWait key={round} seconds={wait} onDone={() => setCanResend(true)} />
            )}
            <Button label={strings.find.otp.changeNumber} variant="quiet" icon="cellphone-text" disabled={busy} onPress={changeNumber} />
          </View>
        </Enter>

        <Enter index={2} style={{ width: padWidth(layout), alignSelf: 'center' }}>
          <NumberPad disabled={locked} onDigit={addDigit} onBackspace={() => setCode((c) => c.slice(0, -1))} onClear={() => setCode('')} />
        </Enter>
      </View>
    </Screen>
  );
}

/** "Resend code in 24s" with a small ring emptying beside it. */
function ResendWait({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const left = useCountdown(seconds);
  return (
    <View style={styles.waiting} accessible accessibilityLabel={strings.find.otp.resendIn(left)}>
      <RingCountdown seconds={seconds} size={44} strokeWidth={5} onDone={onDone} />
      <Text style={styles.waitingText}>{strings.find.otp.resendIn(left)}</Text>
    </View>
  );
}

function Line({ tone, icon, text }: { tone: 'info' | 'warn' | 'ok'; icon: 'shield-check-outline' | 'alert-circle-outline' | 'check-circle-outline'; text: string }) {
  const ink = tone === 'warn' ? colors.dangerStrong : tone === 'ok' ? colors.success : colors.primaryDark;
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
      exiting={FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)}
      style={styles.line}
      accessibilityRole={tone === 'warn' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons name={icon} size={26} color={ink} />
      <Text style={[styles.lineText, { color: ink }]}>{text}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, flexDirection: 'row', gap: spacing.xl, alignItems: 'center' },
  bodyStacked: { flexDirection: 'column', alignItems: 'stretch', gap: spacing.md },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  panelBeside: rowShare(),
  panelCompact: { padding: spacing.md },
  messageSlot: { minHeight: 36, alignItems: 'center', justifyContent: 'center' },
  line: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  lineText: { ...typography.label, flexShrink: 1 },
  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.md },
  // Resend and Change number wrap onto two lines on a narrow phone.
  resendRowCompact: { flexWrap: 'wrap', justifyContent: 'center' },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: sizes.touchMin },
  waitingText: { ...typography.body, color: colors.textSecondary, fontVariant: ['tabular-nums'] },
});
