import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { strings } from '../i18n/strings';
import { parseSetupLink } from '../lib/deeplink';
import { ConnectForm } from '../setup/ConnectForm';
import { decideSetupLink } from '../staff/setupLinkPolicy';
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

  // A kiosk that already has a key never takes a link by itself: a staff member signs in and confirms first.
  // Decided from the kiosk as it was when this screen opened: connecting from the link gives the kiosk
  // a key, which must not turn its own link into a "needs staff" one.
  const [hadKeyOnArrival] = useState(hasKey);
  const decision = decideSetupLink({ hasKey: hadKeyOnArrival });
  const needsStaff = !!link && decision === 'staff-confirm';

  useEffect(() => {
    if (!link || decision !== 'staff-confirm') return;
    holdLink(link);
    router.replace('/staff');
  }, [link, decision, holdLink, router]);

  return (
    <ConnectForm
      onConnected={() => router.replace('/')}
      autoLink={link && decision === 'apply' ? link : null}
      linkError={hasLinkParams && !link && !needsStaff ? strings.setup.badLink : null}
    />
  );
}
