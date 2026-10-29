import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { loadPrinterSettings, savePrinterSettings, type PrinterSettings } from '../../config/kioskConfigStore';
import { strings } from '../../i18n/strings';
import { clinicClock, formatHeaderTime } from '../../lib/time';
import { PressableScale } from '../../motion/Pressable';
import { listUsbPrinters, printTicket, type UsbPrinter } from '../../printer/printService';
import { buildTestSlip } from '../../printer/testSlip';
import { isSavedPrinter, savedPrinterStatus, usbIdentity, usbPrinterSettings } from '../../printer/usbPrinter';
import { Notice, StaffField } from '../../staff/fields';
import { StaffCard, StaffFrame } from '../../staff/StaffFrame';
import { useStaffSession } from '../../staff/useStaffSession';
import { useKioskApp } from '../../store/useKioskApp';
import { colors, fonts, radii, spacing, typography } from '../../theme/tokens';
import { Button } from '../../ui/Button';

type Transport = 'usb' | 'network';
type Result = { tone: 'ok' | 'error'; text: string };

const hex4 = (n: number): string => n.toString(16).padStart(4, '0');

function parsePort(text: string): number | null {
  if (!/^\d{1,5}$/.test(text.trim())) return null;
  const port = Number(text);
  return port >= 1 && port <= 65535 ? port : null;
}

export default function PrinterScreen() {
  const config = useKioskApp((s) => s.config);
  const touch = useStaffSession((s) => s.touch);
  const [saved, setSaved] = useState<PrinterSettings | null>(null);
  const [transport, setTransport] = useState<Transport>('usb');
  const [devices, setDevices] = useState<UsbPrinter[] | null>(null);
  const [finding, setFinding] = useState(true);
  const [chosenId, setChosenId] = useState<number | null>(null);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('9100');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  const refresh = useCallback(async (): Promise<UsbPrinter[]> => {
    try {
      const list = await listUsbPrinters();
      setDevices(list);
      return list;
    } catch {
      setDevices([]);
      return [];
    } finally {
      setFinding(false);
    }
  }, []);
  const find = useCallback(() => {
    setFinding(true);
    return refresh();
  }, [refresh]);

  useEffect(() => {
    void loadPrinterSettings().then((settings) => {
      setSaved(settings);
      if (settings?.transport === 'network') {
        setTransport('network');
        setHost(settings.host ?? '');
        setPort(String(settings.port ?? 9100));
      }
    });
    let live = true;
    listUsbPrinters()
      .then((list) => live && setDevices(list), () => live && setDevices([]))
      .finally(() => live && setFinding(false));
    return () => {
      live = false;
    };
  }, []);

  const chosen = devices?.find((d) => d.deviceId === chosenId && d.printerClass) ?? null;
  const savedUsb = saved?.transport === 'usb' ? saved.usbPrinter : undefined;

  function savedLine(): { tone: 'ok' | 'error' | 'info'; text: string } {
    if (!saved) return { tone: 'info', text: strings.staff.printer.savedNone };
    if (saved.transport === 'network') return { tone: 'ok', text: strings.staff.printer.savedNetwork(saved.host ?? '', saved.port ?? 9100) };
    if (!savedUsb) return { tone: 'info', text: strings.staff.printer.savedNone };
    const status = devices ? savedPrinterStatus(devices, savedUsb) : 'connected';
    const name = devices?.find((d) => isSavedPrinter(d, savedUsb))?.name;
    if (status === 'different-serial') return { tone: 'error', text: strings.staff.printer.differentSerial };
    if (status === 'not-connected') return { tone: 'error', text: strings.staff.printer.notConnected };
    return { tone: 'ok', text: name ? strings.staff.printer.savedUsb(name) : strings.staff.printer.savedUsbModel };
  }

  /** The settings the screen would save now, or a message about what is missing. */
  function draft(): { ok: true; settings: PrinterSettings } | { ok: false; reason: string } {
    if (transport === 'usb') {
      return chosen ? { ok: true, settings: { transport: 'usb', usbPrinter: usbIdentity(chosen) } } : { ok: false, reason: strings.staff.printer.pickFirst };
    }
    const portNumber = parsePort(port);
    if (!host.trim()) return { ok: false, reason: strings.staff.printer.needHost };
    if (portNumber === null) return { ok: false, reason: strings.staff.printer.badPort };
    return { ok: true, settings: { transport: 'network', host: host.trim(), port: portNumber } };
  }

  async function testPrint() {
    touch();
    const plan = draft();
    if (!plan.ok) return setResult({ tone: 'error', text: plan.reason });
    setBusy(true);
    setResult(null);
    const when = config ? formatHeaderTime(clinicClock(config.clinic)(), config.clinic.utcOffsetMinutes) : formatHeaderTime(new Date(), -new Date().getTimezoneOffset());
    // The real print service: the same retries, and the same refusal to print on any other USB device.
    const outcome = await printTicket(buildTestSlip(when), plan.settings);
    setResult(outcome.ok ? { tone: 'ok', text: strings.staff.printer.testOk } : { tone: 'error', text: strings.staff.printer.testFailed(outcome.reason) });
    // Android may have just granted access: the serial is readable now, so list again.
    if (transport === 'usb') await find();
    setBusy(false);
  }

  async function save() {
    touch();
    const plan = draft();
    if (!plan.ok) return setResult({ tone: 'error', text: plan.reason });
    setBusy(true);
    try {
      let settings = plan.settings;
      if (transport === 'usb' && chosen) {
        // Save what the printer reports now, so its serial is part of the identity when Android shows it.
        const fresh = (await find()).find((d) => d.deviceId === chosen.deviceId && d.printerClass) ?? chosen;
        settings = usbPrinterSettings(fresh);
      }
      await savePrinterSettings(settings);
      setSaved(settings);
      setResult({ tone: 'ok', text: strings.staff.printer.saved });
    } catch (err) {
      setResult({ tone: 'error', text: err instanceof Error ? err.message : strings.errors.generic });
    } finally {
      setBusy(false);
    }
  }

  const line = savedLine();

  return (
    <StaffFrame title={strings.staff.printer.title} onBack={() => router.back()}>
      <Notice tone={line.tone}>{line.text}</Notice>

      <StaffCard>
        <Text style={styles.label}>{strings.staff.printer.transport}</Text>
        <View style={styles.radios} accessibilityRole="radiogroup">
          {(['usb', 'network'] as const).map((t) => (
            <PressableScale
              key={t}
              accessibilityRole="radio"
              accessibilityState={{ selected: transport === t }}
              onPress={() => {
                touch();
                setTransport(t);
                setResult(null);
              }}
              style={[styles.radio, transport === t && styles.radioOn]}
            >
              <View style={[styles.dot, transport === t && styles.dotOn]} />
              <Text style={styles.radioText}>{t === 'usb' ? strings.staff.printer.usb : strings.staff.printer.network}</Text>
            </PressableScale>
          ))}
        </View>

        {transport === 'usb' ? (
          <View style={styles.gap}>
            <Button label={finding ? strings.staff.printer.finding : strings.staff.printer.find} variant="secondary" icon="usb" loading={finding} onPress={() => { touch(); void find(); }} />
            {devices && devices.length === 0 ? <Text style={styles.hint}>{strings.staff.printer.noneFound}</Text> : null}
            {devices?.map((d) => {
              const on = d.deviceId === chosenId && d.printerClass;
              return (
                <PressableScale
                  key={d.deviceId}
                  disabled={!d.printerClass}
                  accessibilityState={{ selected: on, disabled: !d.printerClass }}
                  onPress={() => {
                    touch();
                    setChosenId(d.deviceId);
                    setResult(null);
                  }}
                  style={[styles.row, on && styles.rowOn, !d.printerClass && styles.rowOff]}
                >
                  <View style={styles.rowText}>
                    <Text style={styles.rowName} numberOfLines={1}>{d.name || `${hex4(d.vendorId)}:${hex4(d.productId)}`}</Text>
                    <Text style={styles.hint} numberOfLines={1}>
                      {`${hex4(d.vendorId)}:${hex4(d.productId)}  -  ${d.serial ? `serial ${d.serial}` : strings.staff.printer.permissionHint}${d.printerClass ? '' : `  -  ${strings.staff.printer.notPrinterClass}`}`}
                    </Text>
                  </View>
                  {isSavedPrinter(d, savedUsb) ? <Text style={styles.tag}>{strings.staff.printer.isSaved}</Text> : null}
                </PressableScale>
              );
            })}
          </View>
        ) : (
          <View style={styles.gap}>
            <StaffField label={strings.staff.printer.host} placeholder={strings.staff.printer.hostPlaceholder} value={host} onChangeText={setHost} autoCapitalize="none" autoCorrect={false} keyboardType="url" />
            <StaffField label={strings.staff.printer.port} value={port} onChangeText={setPort} keyboardType="number-pad" />
          </View>
        )}
      </StaffCard>

      {result ? <Notice tone={result.tone}>{result.text}</Notice> : null}
      <View style={styles.actions}>
        <Button style={styles.action} label={busy ? strings.staff.printer.testing : strings.staff.printer.test} variant="secondary" icon="printer" loading={busy} onPress={() => void testPrint()} />
        <Button style={styles.action} label={strings.staff.printer.save} icon="content-save-outline" disabled={busy} onPress={() => void save()} />
      </View>
    </StaffFrame>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, color: colors.textSecondary, fontFamily: fonts.semibold },
  hint: { ...typography.caption, color: colors.textSecondary },
  gap: { gap: spacing.sm },
  radios: { flexDirection: 'row', gap: spacing.md },
  radio: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 64, paddingHorizontal: spacing.md, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  radioOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  radioText: { ...typography.label, color: colors.textPrimary },
  dot: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: colors.borderDark, backgroundColor: colors.card },
  dotOn: { borderColor: colors.primary, borderWidth: 7 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, minHeight: 64, borderRadius: radii.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.background },
  rowOn: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  rowOff: { opacity: 0.55 },
  rowText: { flex: 1, gap: 2 },
  rowName: { fontFamily: fonts.semibold, fontSize: 20, color: colors.textPrimary },
  tag: { ...typography.small, color: colors.success, backgroundColor: colors.accentLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.pill, overflow: 'hidden' },
  actions: { flexDirection: 'row', gap: spacing.md },
  action: { flex: 1 },
});
