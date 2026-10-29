import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { SplashScreen, Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFlow } from '../flow/useFlow';
import { InactivityGuard } from '../flow/useInactivity';
import { strings } from '../i18n/strings';
import { feedback } from '../motion/feedback';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, radii } from '../theme/tokens';
import { KioskShell } from '../ui/KioskShell';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const onSetup = (useSegments() as string[])[0] === 'setup';
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold });
  const { status, loadError, reload } = useKioskApp();
  const resetting = useFlow((s) => s.resetting);
  const reduced = useReducedMotion();

  useEffect(() => {
    void reload();
    void feedback.prepare();
  }, [reload]);

  const ready = (fontsLoaded || fontError) && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <InactivityGuard>
        <KioskShell>
          {/* Forward steps slide in from the right; Start over (and reduced motion) fades. */}
          {/* The patient screens need a configured kiosk; without one (or when its key is removed mid-flow), navigation falls back to /setup. */}
          <Stack
            screenOptions={{
              headerShown: false,
              animation: reduced || resetting ? 'fade' : 'slide_from_right',
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Protected guard={status === 'ready' || status === 'offline'}>
              <Stack.Screen name="index" />
              <Stack.Screen name="patient" />
              <Stack.Screen name="has-token" />
              <Stack.Screen name="find/index" />
              <Stack.Screen name="find/otp" />
              <Stack.Screen name="find/choose" />
              <Stack.Screen name="register" />
              <Stack.Screen name="department" />
              <Stack.Screen name="doctor" />
            </Stack.Protected>
            <Stack.Screen name="setup" />
          </Stack>
        </KioskShell>
      </InactivityGuard>
      {status === 'offline' && !onSetup ? (
        <View style={styles.offline}>
          <Text style={styles.offlineTitle}>{strings.offline.title}</Text>
          <Text style={styles.offlineText}>{loadError ?? strings.errors.network}</Text>
          <Pressable style={styles.retry} accessibilityRole="button" onPress={() => void reload()}>
            <Text style={styles.retryText}>{strings.offline.retry}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/setup')}>
            <Text style={styles.link}>{strings.offline.changeSetup}</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  offline: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  offlineTitle: { fontFamily: fonts.bold, fontSize: 32, color: colors.textPrimary },
  offlineText: { fontFamily: fonts.regular, fontSize: 20, color: colors.textSecondary },
  retry: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: 40, height: 64, justifyContent: 'center' },
  retryText: { fontFamily: fonts.semibold, fontSize: 22, color: '#fff' },
  link: { fontFamily: fonts.medium, fontSize: 16, color: colors.primary },
});
