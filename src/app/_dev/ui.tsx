import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Redirect } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FlowStep } from '../../flow/steps';
import { StillThere } from '../../flow/useInactivity';
import { Enter } from '../../motion/Enter';
import { feedback, useFeedbackSettings } from '../../motion/feedback';
import { PressableScale } from '../../motion/Pressable';
import { colors, fonts, methodColors, radii, shadows, spacing, typography } from '../../theme/tokens';
import { Avatar } from '../../ui/Avatar';
import { BigTile } from '../../ui/BigTile';
import { Button } from '../../ui/Button';
import { CheckBurst } from '../../ui/CheckBurst';
import { Countdown } from '../../ui/Countdown';
import { LiveDot } from '../../ui/LiveDot';
import { NumberPad } from '../../ui/NumberPad';
import { OtpBoxes, type OtpStatus } from '../../ui/OtpBoxes';
import { QrView } from '../../ui/QrView';
import { RingCountdown } from '../../ui/RingCountdown';
import { Ripple } from '../../ui/Ripple';
import { RollingNumber } from '../../ui/RollingNumber';
import { SampleStrip } from '../../ui/SampleStrip';
import { useShake } from '../../ui/Shake';
import { StatusPanel } from '../../ui/StatusPanel';
import { StepTitle } from '../../ui/StepTitle';
import { contentWidth, fit } from '../../ui/sizing';
import { Stepper } from '../../ui/Stepper';
import { useLayout } from '../../ui/useLayout';

// Developer gallery of the kiosk UI kit (/_dev/ui): every primitive, live, for a quick visual check
// and for the tablet screenshots. Not reachable in release builds.

const SAMPLE_UPI = 'upi://pay?pa=medios.sample@sample&pn=MediOS%20SAMPLE&am=300&cu=INR&tn=OP%20visit%20SAMPLE';

export default function UiGallery() {
  if (!__DEV__) return <Redirect href="/" />;
  return <Gallery />;
}

function Gallery() {
  const [otp, setOtp] = useState('');
  const [otpStatus, setOtpStatus] = useState<OtpStatus>('idle');
  const [step, setStep] = useState<FlowStep>(1);
  const [token, setToken] = useState(24);
  const [replay, setReplay] = useState(0);
  const [burst, setBurst] = useState(false);
  const [selected, setSelected] = useState('GEN');
  const [askStill, setAskStill] = useState(false);
  const shakeDemo = useShake();
  const { soundsOn, setSoundsOn } = useFeedbackSettings();
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  const compact = layout.size === 'compact';
  // Room inside a specimen card: the page gutters, the card's own padding and borders.
  const inner = Math.max(0, layout.width - 2 * layout.gutter - insets.left - insets.right - 2 * (compact ? spacing.md : spacing.lg) - 2);
  const padWidth = fit(420, inner);
  const qrFrame = fit(404, inner - 16);
  const qrSize = qrFrame - 84;
  const tile = { flexGrow: 1, flexBasis: 160, minWidth: 140 };

  const type = (d: string) => {
    setOtpStatus('idle');
    setOtp((v) => (v.length < 6 ? v + d : v));
  };

  return (
    <View style={styles.fill}>
      <ScrollView
        contentContainerStyle={[
          styles.page,
          {
            paddingLeft: layout.gutter + insets.left,
            paddingRight: layout.gutter + insets.right,
            paddingBottom: layout.gutter + insets.bottom,
            gap: compact ? spacing.md : spacing.lg,
          },
        ]}
      >
        <StepTitle style={styles.wide} title="Kiosk UI kit" subtitle="Every primitive, live. Tap things." step={{ current: 2, total: 5 }} />

        <Specimen title="Stepper" wide>
          <View style={styles.stepper}>
            <Stepper current={step} />
          </View>
          <Row>
            {([0, 1, 2, 3] as FlowStep[]).map((s) => (
              <Button key={s} label={`Step ${s + 1}`} variant={s === step ? 'primary' : 'secondary'} onPress={() => setStep(s)} />
            ))}
          </Row>
        </Specimen>

        <Specimen title="Buttons" wide>
          <Row>
            <Button label="Continue" variant="success" icon="arrow-right" iconPosition="end" size="large" />
            <Button label="Send OTP" icon="message-text-outline" />
            <Button label="Not me" variant="secondary" />
            <Button label="Change mobile number" variant="quiet" />
          </Row>
          <Row>
            <Button label="Printing…" loading />
            <Button label="Select" disabled />
            <Button label="Choose another method" variant="secondary" disabled />
          </Row>
        </Specimen>

        <Specimen title="Big tiles: welcome (row)" wide>
          <BigTile
            orientation="row"
            title="Tap your card"
            subtitle="Existing patient (fastest)"
            badge="Fastest"
            art={
              <Ripple size={96} burst={burst}>
                <View style={styles.cardIcon}>
                  <MaterialCommunityIcons name="contactless-payment" size={34} color={colors.textOnColor} />
                </View>
              </Ripple>
            }
            onPress={() => {
              setBurst(true);
              feedback.success();
              setTimeout(() => setBurst(false), 900);
            }}
          />
          <BigTile orientation="row" title="Find my record" subtitle="Forgot your card? Use your mobile number" icon="cellphone-message" color={colors.purple} />
          <BigTile orientation="row" title="New patient" subtitle="First visit" icon="account-plus-outline" color={colors.successBright} />
        </Specimen>

        <Specimen title="Big tiles: departments (column)" wide>
          <Row>
            {[
              { code: 'GEN', title: 'General Medicine', icon: 'stethoscope' as const, color: '#1E6BFF' },
              { code: 'PED', title: 'Pediatrics', icon: 'baby-face-outline' as const, color: '#7C3AED' },
              { code: 'CAR', title: 'Cardiology', icon: 'heart-pulse' as const, color: '#DC2626' },
              { code: 'DER', title: 'Dermatology', icon: 'hand-heart-outline' as const, color: '#DB2777', disabled: true },
            ].map((d) => (
              <BigTile
                key={d.code}
                title={d.title}
                subtitle={d.disabled ? 'No doctors today' : '3 doctors'}
                icon={d.icon}
                color={d.color}
                selected={selected === d.code}
                disabled={d.disabled}
                onPress={() => setSelected(d.code)}
                style={tile}
              />
            ))}
          </Row>
        </Specimen>

        <Specimen title="Big tiles: payment methods (filled)" wide>
          <Row>
            <BigTile filled title="UPI" subtitle="Scan QR with GPay, PhonePe, Paytm" icon="qrcode-scan" color={methodColors.UPI} style={tile} />
            <BigTile filled title="Cash" subtitle="Pay at the counter, staff confirm" icon="cash" color={methodColors.CASH} style={tile} />
            <BigTile filled title="Card" subtitle="Tap or insert on the card machine" icon="credit-card-outline" color={methodColors.CARD} style={tile} />
          </Row>
        </Specimen>

        <Specimen title="Number pad and OTP boxes">
          <OtpBoxes value={otp} status={otpStatus} />
          <NumberPad
            onDigit={type}
            onBackspace={() => {
              setOtpStatus('idle');
              setOtp((v) => v.slice(0, -1));
            }}
            onClear={() => {
              setOtpStatus('idle');
              setOtp('');
            }}
            style={{ width: padWidth, alignSelf: 'center' }}
          />
          <Row>
            <Button
              label="Wrong code"
              variant="secondary"
              onPress={() => {
                setOtpStatus('error');
                feedback.error();
              }}
            />
            <Button
              label="Right code"
              variant="success"
              onPress={() => {
                setOtpStatus('success');
                feedback.success();
              }}
            />
          </Row>
        </Specimen>

        <Specimen title="QR view and SAMPLE strip">
          <View style={styles.qrFrame}>
            <RingCountdown key={`qr-${replay}`} seconds={300} total={300} size={qrFrame} strokeWidth={8}>
              <QrView key={`q-${replay}`} value={SAMPLE_UPI} size={qrSize} />
            </RingCountdown>
          </View>
          <SampleStrip text="SAMPLE: do not pay. This QR cannot receive money." />
          <Row>
            <Text style={styles.body}>Expires in</Text>
            <Countdown key={`c-${replay}`} seconds={300} format="clock" />
          </Row>
        </Specimen>

        <Specimen title="Payment success (CheckBurst)">
          <View style={styles.centre}>
            <CheckBurst key={`check-${replay}`} />
          </View>
          <Button label="Play again" icon="replay" variant="secondary" onPress={() => setReplay((n) => n + 1)} />
        </Specimen>

        <Specimen title="Rolling numbers">
          <View style={styles.tokenCard}>
            <Text style={styles.caption}>Your token</Text>
            <RollingNumber value={`G-${String(token).padStart(3, '0')}`} style={[styles.token, compact && styles.tokenCompact]} />
          </View>
          <RollingNumber key={`code-${replay}`} value="4821" style={styles.code} delay={150} />
          <Button label="Next token" icon="plus" variant="secondary" onPress={() => setToken((n) => n + 1)} />
        </Specimen>

        <Specimen title="Countdown ring, live dot, shake">
          <Row>
            <RingCountdown key={`ring-${replay}`} seconds={30} size={120}>
              <Countdown key={`n-${replay}`} seconds={30} style={styles.ringNumber} />
            </RingCountdown>
            <View style={styles.pill}>
              <LiveDot />
              <Text style={styles.pillText}>Available now</Text>
            </View>
          </Row>
          <Animated.View style={[styles.shakeCard, shakeDemo.style]}>
            <Text style={styles.body}>{"This card isn't linked yet."}</Text>
          </Animated.View>
          <Button
            label="Shake"
            variant="secondary"
            onPress={() => {
              shakeDemo.shake();
              feedback.error();
            }}
          />
        </Specimen>

        <Specimen title="Staggered entrance">
          {['Dr. Shajin', 'Dr. Arun Kumar', 'Dr. Priya Fernandez', 'Dr. Suresh Nair'].map((name, i) => (
            <Enter key={`${name}-${replay}`} index={i}>
              <PressableScale style={styles.listRow} highlight="rgba(30, 107, 255, 0.06)">
                <Avatar name={name} size={56} />
                <Text style={styles.rowName}>{name}</Text>
                <MaterialCommunityIcons name="chevron-right" size={30} color={colors.textTertiary} />
              </PressableScale>
            </Enter>
          ))}
          <Button label="Replay" icon="replay" variant="secondary" onPress={() => setReplay((n) => n + 1)} />
        </Specimen>

        <Specimen title="Avatars">
          <Row>
            {['Ramesh Kumar', 'jeswin shijo', 'ssss', 'Dr. Priya Fernandez', 'Meena R'].map((n) => (
              <Avatar key={n} name={n} size={72} />
            ))}
          </Row>
        </Specimen>

        <Specimen title="Status panels">
          <View style={styles.statusBox}>
            <StatusPanel state="loading" message="Finding today's doctors…" />
          </View>
          <View style={styles.statusBox}>
            <StatusPanel state="error" message="The kiosk cannot reach the hospital server." onRetry={() => feedback.tap()} />
          </View>
        </Specimen>

        <Specimen title="Feedback and the idle dialog">
          <Row>
            <Button label="Tap" variant="secondary" onPress={() => feedback.tap()} />
            <Button label="Success" variant="secondary" onPress={() => feedback.success()} />
            <Button label="Error" variant="secondary" onPress={() => feedback.error()} />
          </Row>
          <Row>
            <Switch value={soundsOn} onValueChange={(on) => void setSoundsOn(on)} />
            <Text style={styles.body}>Sounds {soundsOn ? 'on' : 'off'}</Text>
          </Row>
          <Button label='Show "Are you still there?"' icon="timer-sand" onPress={() => setAskStill(true)} />
        </Specimen>
      </ScrollView>
      {askStill ? <StillThere onStay={() => setAskStill(false)} onStartOver={() => setAskStill(false)} /> : null}
    </View>
  );
}

function Specimen({ title, wide = false, children }: { title: string; wide?: boolean; children: ReactNode }) {
  const layout = useLayout();
  // A half-width card is 520 where there is room for two, and the whole row where there is not.
  const half = { flexGrow: 1, flexBasis: fit(520, contentWidth(layout)) };
  return (
    <View style={[styles.specimen, layout.size === 'compact' && styles.specimenCompact, wide ? styles.wide : half]}>
      <Text style={styles.specimenTitle}>{title}</Text>
      {children}
    </View>
  );
}

const Row = ({ children }: { children: ReactNode }) => <View style={styles.row}>{children}</View>;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  page: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: spacing.md },
  specimen: { gap: spacing.md, padding: spacing.lg, borderRadius: radii.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, boxShadow: shadows.card },
  wide: { width: '100%' },
  specimenCompact: { padding: spacing.md },
  specimenTitle: { ...typography.label, color: colors.textSecondary },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacing.md },
  stepper: { height: 60 },
  qrFrame: { alignSelf: 'center', padding: 8, borderRadius: radii.lg, backgroundColor: colors.card },
  centre: { alignItems: 'center' },
  body: { ...typography.body, color: colors.textPrimary },
  caption: { ...typography.caption, color: colors.textSecondary },
  cardIcon: { width: 56, height: 56, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  tokenCard: { alignItems: 'center', paddingVertical: spacing.md, borderRadius: radii.md, backgroundColor: colors.primaryLight },
  token: { ...typography.display, color: colors.primaryDark },
  tokenCompact: { fontSize: 72, lineHeight: 82 },
  code: { fontFamily: fonts.bold, fontSize: 64, lineHeight: 72, letterSpacing: 8, color: colors.textPrimary, alignSelf: 'center' },
  ringNumber: { fontFamily: fonts.bold, fontSize: 36, lineHeight: 42 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.accentLight },
  pillText: { ...typography.caption, color: colors.success },
  shakeCard: { padding: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.dangerStrong, backgroundColor: colors.dangerLight },
  listRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, minHeight: 80, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, marginBottom: spacing.sm },
  rowName: { ...typography.bodyLarge, fontFamily: fonts.medium, color: colors.textPrimary, flex: 1 },
  statusBox: { height: 300, borderRadius: radii.md, backgroundColor: colors.background },
});
