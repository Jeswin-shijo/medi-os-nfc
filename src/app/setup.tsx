import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { strings } from '../i18n/strings';
import { parseSetupLink } from '../lib/deeplink';
import { ConnectForm } from '../setup/ConnectForm';
import { decideSetupScreen } from '../staff/setupLinkPolicy';
import { useStaffSession } from '../staff/useStaffSession';
import { useKioskApp } from '../store/useKioskApp';

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export default function SetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ api?: string; key?: string; printer?: string }>();
  const hasKey = useKioskApp((s) => s.status === 'ready' || s.status === 'offline');
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
  const decision = decideSetupScreen({ hasKey: hadKeyOnArrival, link });

  useEffect(() => {
    if (decision === 'confirm-with-staff' && link) {
      holdLink(link);
      router.replace('/staff');
    } else if (decision === 'staff') {
      router.replace('/staff');
    }
  }, [decision, link, holdLink, router]);

  // The open form is for a kiosk with no key only.
  if (decision === 'confirm-with-staff' || decision === 'staff') return null;

  return (
    <ConnectForm
      onConnected={() => router.replace('/')}
      autoLink={decision === 'apply' ? link : null}
      linkError={hasLinkParams && !link ? strings.setup.badLink : null}
    />
  );
}
