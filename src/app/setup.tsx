import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { KioskApiError } from '../api/client';
import { strings } from '../i18n/strings';
import { normalizeApiUrl, parseSetupLink, type SetupLink } from '../lib/deeplink';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, radii, spacing } from '../theme/tokens';

const first = (value: string | string[] | undefined): string | undefined => (Array.isArray(value) ? value[0] : value);

export default function SetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ api?: string; key?: string; printer?: string }>();
  const { connect, notice, address } = useKioskApp();
  const [server, setServer] = useState(address);
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handledLink = useRef<string | null>(null);

  useEffect(() => {
    if (address) setServer((current) => current || address);
  }, [address]);

  async function submit(settings: { apiUrl: string; key: string }, printer?: SetupLink['printer']) {
    setBusy(true);
    setError(null);
    try {
      await connect(settings, printer);
      router.replace('/');
    } catch (err) {
      if (err instanceof KioskApiError) setError(err.code === 'KIOSK_REVOKED' ? strings.setup.badKey : err.message);
      else setError(strings.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  // The kiosk link (medios-reception://setup?api=...&key=...) opens this screen with those values: connect without typing.
  const linkApi = first(params.api);
  const linkKey = first(params.key);
  const linkPrinter = first(params.printer);
  useEffect(() => {
    if (!linkApi && !linkKey) return;
    const query = [`api=${encodeURIComponent(linkApi ?? '')}`, `key=${encodeURIComponent(linkKey ?? '')}`, linkPrinter ? `printer=${encodeURIComponent(linkPrinter)}` : '']
      .filter(Boolean)
      .join('&');
    if (handledLink.current === query) return;
    handledLink.current = query;
    const link = parseSetupLink(`medios-reception://setup?${query}`);
    if (!link) {
      setError(strings.setup.badLink);
      return;
    }
    setServer(link.apiUrl);
    setKey(link.key);
    void submit({ apiUrl: link.apiUrl, key: link.key }, link.printer);
  }, [linkApi, linkKey, linkPrinter]);

  function onConnect() {
    const apiUrl = normalizeApiUrl(server);
    if (!server.trim() || !key.trim()) return setError(strings.setup.needBoth);
    if (!apiUrl) return setError(strings.setup.badAddress);
    void submit({ apiUrl, key: key.trim() });
  }

  return (
    <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>{strings.setup.title}</Text>
          <Text style={styles.intro}>{strings.setup.intro}</Text>

          {notice ? (
            <View style={styles.notice} accessibilityRole="alert">
              <Text style={styles.noticeText}>{notice}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{strings.setup.serverLabel}</Text>
          <TextInput
            style={styles.input}
            value={server}
            onChangeText={setServer}
            placeholder={strings.setup.serverPlaceholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            editable={!busy}
          />

          <Text style={styles.label}>{strings.setup.keyLabel}</Text>
          <TextInput
            style={styles.input}
            value={key}
            onChangeText={setKey}
            placeholder={strings.setup.keyPlaceholder}
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            editable={!busy}
            onSubmitEditing={onConnect}
          />

          {error ? (
            <Text style={styles.error} accessibilityRole="alert">
              {error}
            </Text>
          ) : null}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, busy && styles.buttonBusy]}
            onPress={onConnect}
            disabled={busy}
            accessibilityRole="button"
          >
            {busy ? <ActivityIndicator color="#fff" /> : null}
            <Text style={styles.buttonText}>{busy ? strings.setup.connecting : strings.setup.connect}</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  card: {
    width: '100%',
    maxWidth: 640,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  title: { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary },
  intro: { fontFamily: fonts.regular, fontSize: 18, lineHeight: 26, color: colors.textSecondary, marginBottom: spacing.md },
  notice: { backgroundColor: colors.warningLight, borderRadius: radii.sm, padding: spacing.md, marginBottom: spacing.sm },
  noticeText: { fontFamily: fonts.medium, fontSize: 18, color: colors.navy },
  label: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textSecondary, marginTop: spacing.sm },
  input: {
    height: 64,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.borderDark,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 20,
    color: colors.textPrimary,
    backgroundColor: colors.background,
  },
  error: { fontFamily: fonts.medium, fontSize: 18, color: colors.danger, marginTop: spacing.sm },
  button: {
    marginTop: spacing.md,
    height: 68,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  buttonPressed: { backgroundColor: colors.primaryDark },
  buttonBusy: { opacity: 0.7 },
  buttonText: { fontFamily: fonts.semibold, fontSize: 22, color: '#fff' },
});
