import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { KioskApiError } from '../../api/client';
import { staffLogin } from '../../api/staff';
import { strings } from '../../i18n/strings';
import { canUseStaffMenu } from '../../staff/session';
import { hostOfApiUrl } from '../../staff/setupLinkPolicy';
import { Notice, StaffField } from '../../staff/fields';
import { StaffCard, StaffFrame } from '../../staff/StaffFrame';
import { leaveStaffMode } from '../../staff/useStaffGuard';
import { useStaffSession } from '../../staff/useStaffSession';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, spacing, typography } from '../../theme/tokens';
import { BigTile } from '../../ui/BigTile';
import { useLayout } from '../../ui/useLayout';
import { staffSizes } from '../../staff/staffSizing';
import { Button } from '../../ui/Button';

export default function StaffIndex() {
  const token = useStaffSession((s) => s.token);
  const pendingLink = useStaffSession((s) => s.pendingLink);
  if (!token) return <SignIn />;
  return pendingLink ? <ConfirmSetupLink /> : <Menu />;
}

function SignIn() {
  const address = useKioskApp((s) => s.address);
  const signIn = useStaffSession((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!email.trim() || !password) return setError(strings.staff.signIn.needBoth);
    setBusy(true);
    setError(null);
    try {
      const { accessToken, user } = await staffLogin(address, email, password);
      if (!canUseStaffMenu(user.role)) setError(strings.staff.signIn.wrongRole);
      else signIn(accessToken, user);
    } catch (err) {
      if (err instanceof KioskApiError) setError(err.code === 'RATE_LIMITED' ? strings.staff.signIn.locked : err.message);
      else setError(strings.errors.generic);
    } finally {
      setPassword('');
      setBusy(false);
    }
  }

  return (
    <StaffFrame title={strings.staff.signIn.title} requireSession={false} onBack={leaveStaffMode}>
      <StaffCard style={styles.narrow}>
        <Text style={styles.intro}>{strings.staff.signIn.intro}</Text>
        <StaffField
          label={strings.staff.signIn.email}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!busy}
        />
        <StaffField
          label={strings.staff.signIn.password}
          value={password}
          onChangeText={setPassword}
          autoCapitalize="none"
          autoCorrect={false}
          secureTextEntry
          editable={!busy}
          onSubmitEditing={() => void submit()}
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button label={busy ? strings.staff.signIn.signingIn : strings.staff.signIn.submit} icon="login" loading={busy} onPress={() => void submit()} />
        <Button label={strings.staff.signIn.cancel} variant="quiet" onPress={leaveStaffMode} />
      </StaffCard>
    </StaffFrame>
  );
}

/** A setup link opened on a kiosk that already has a key: applied only after a staff member confirms. */
function ConfirmSetupLink() {
  const link = useStaffSession((s) => s.pendingLink);
  const drop = useStaffSession((s) => s.dropSetupLink);
  const connect = useKioskApp((s) => s.connect);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!link) return null;

  async function apply() {
    if (!link) return;
    setBusy(true);
    setError(null);
    try {
      await connect({ apiUrl: link.apiUrl, key: link.key }, link.printer);
      leaveStaffMode();
    } catch (err) {
      setError(err instanceof KioskApiError ? (err.code === 'KIOSK_REVOKED' ? strings.setup.badKey : err.message) : strings.errors.generic);
      setBusy(false);
    }
  }

  return (
    <StaffFrame title={strings.staff.title}>
      <StaffCard style={styles.narrow}>
        <Text style={styles.confirmTitle} accessibilityRole="header">
          {strings.staff.pointAt(hostOfApiUrl(link.apiUrl))}
        </Text>
        <Text style={styles.intro}>{strings.staff.pointAtBody}</Text>
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button label={strings.staff.pointApply} icon="check" loading={busy} onPress={() => void apply()} />
        <Button label={strings.staff.pointCancel} variant="secondary" disabled={busy} onPress={drop} />
      </StaffCard>
    </StaffFrame>
  );
}

function Menu() {
  const { tileBasis } = staffSizes(useLayout());
  const tile = { flexBasis: tileBasis };
  return (
    <StaffFrame title={strings.staff.title}>
      <View style={styles.grid}>
        <BigTile style={[styles.tile, tile]} orientation="row" icon="credit-card-wireless-outline" title={strings.staff.menu.linkCard.title} subtitle={strings.staff.menu.linkCard.subtitle} onPress={() => router.push('/staff/link-card')} />
        <BigTile style={[styles.tile, tile]} orientation="row" icon="printer-pos" title={strings.staff.menu.printer.title} subtitle={strings.staff.menu.printer.subtitle} color={colors.purple} onPress={() => router.push('/staff/printer')} />
        <BigTile style={[styles.tile, tile]} orientation="row" icon="cog-outline" title={strings.staff.menu.setup.title} subtitle={strings.staff.menu.setup.subtitle} color={colors.navy} onPress={() => router.push('/staff/setup')} />
        <BigTile style={[styles.tile, tile]} orientation="row" icon="logout" title={strings.staff.menu.exit.title} subtitle={strings.staff.menu.exit.subtitle} color={colors.dangerStrong} onPress={leaveStaffMode} />
      </View>
    </StaffFrame>
  );
}

const styles = StyleSheet.create({
  narrow: { alignSelf: 'center', width: '100%', maxWidth: 560 },
  intro: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm },
  confirmTitle: { ...typography.headline, color: colors.textPrimary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md },
  tile: { flexGrow: 1 },
});
