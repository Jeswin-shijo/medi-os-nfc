import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n/strings';
import { parseSetupLink } from '../lib/deeplink';
import { ConnectForm } from '../setup/ConnectForm';
import { decideSetupScreen } from '../staff/setupLinkPolicy';
import { useStaffSession } from '../staff/useStaffSession';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts } from '../theme/tokens';

function RemovedNotice({ title }: { title: string }) {
  return (
    <View style={styles.removed}>
      <Text style={styles.removedTitle} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.removedHint}>{strings.offline.staffHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  removed: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 40 },
  removedTitle: { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary, textAlign: 'center' },
  removedHint: { fontFamily: fonts.regular, fontSize: 18, color: colors.textTertiary, textAlign: 'center' },
});

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export default function SetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ api?: string; key?: string; printer?: string }>();
  const hasKey = useKioskApp((s) => s.status === 'ready' || s.status === 'offline');
  const hasServer = useKioskApp((s) => s.address !== '');
  const holdLink = useStaffSession((s) => s.holdSetupLink);

  const linkApi = first(params.api);
  const linkKey = first(params.key);
  const linkPrinter = first(params.printer);
  const hasLinkParams = !!(linkApi || linkKey);

  const link = useMemo(() => {
    if (!hasLinkParams) return null;
    const query = [`api=${encodeURIComponent(linkApi ?? '')}`, `key=${encodeURIComponent(linkKey ?? '')}`, linkPrinter ? `printer=${encodeURIComponent(linkPrinter)}` : '']
      .filter(Boolean)
      .join('&');
    return parseSetupLink(`medios-reception://setup?${query}`);
  }, [hasLinkParams, linkApi, linkKey, linkPrinter]);

  // Decided from the kiosk as it was when this screen opened: connecting from a link gives the kiosk
  // a key, which must not turn its own link into a "needs staff" one.
  const [hadKeyOnArrival] = useState(hasKey);
  const [hadServerOnArrival] = useState(hasServer);
  const decision = decideSetupScreen({ hasKey: hadKeyOnArrival, hadServer: hadServerOnArrival, link });

  useEffect(() => {
    if (decision === 'confirm-with-staff' && link) {
      holdLink(link);
      router.replace('/staff');
    } else if (decision === 'staff') {
      router.replace('/staff');
    }
  }, [decision, link, holdLink, router]);

  // Never blank: when staff sign-in is not reachable (no stored server), say so instead.
  if (decision === 'confirm-with-staff' || decision === 'staff') return hasServer ? null : <RemovedNotice title={strings.offline.title} />;
  // Key removed: no open form. Staff hold the logo, sign in, and set a new key from Kiosk setup.
  if (decision === 'removed') return <RemovedNotice title={strings.errors.revoked} />;
  // The open form is for a fresh install only.

  return (
    <ConnectForm
      onConnected={() => router.replace('/')}
      autoLink={decision === 'apply' ? link : null}
      linkError={hasLinkParams && !link ? strings.setup.badLink : null}
    />
  );
}
