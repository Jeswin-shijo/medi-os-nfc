import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_600SemiBold,
  IBMPlexSans_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans';
import { useKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import { router, SplashScreen, Stack, usePathname, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { hardwareBackAction } from '../flow/backPolicy';
import { useFlow } from '../flow/useFlow';
import { InactivityGuard } from '../flow/useInactivity';
import { strings } from '../i18n/strings';
import { feedback } from '../motion/feedback';
import { useEndStaffOutsideStaff } from '../staff/useStaffGuard';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, radii } from '../theme/tokens';
import { KioskShell } from '../ui/KioskShell';
import { useLayout } from '../ui/useLayout';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const firstSegment = (useSegments() as string[])[0];
  // Setup and the staff menu need no server answer, so the offline cover stays off them.
  const onSetup = firstSegment === 'setup' || firstSegment === 'staff';
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold });
  const { status, loadError, reload, address } = useKioskApp();
  const hasServer = address !== '';
  const resetting = useFlow((s) => s.resetting);
  const reduced = useReducedMotion();
  useEndStaffOutsideStaff();
  useKioskMode();

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
      <StatusBar style="light" hidden />
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
              <Stack.Screen name="payment" />
              <Stack.Screen name="pay/upi" />
              <Stack.Screen name="pay/cash" />
              <Stack.Screen name="pay/card" />
              <Stack.Screen name="paid" />
              <Stack.Screen name="ticket" />
            </Stack.Protected>
            {/* First: a fresh install, or a kiosk whose key was removed, opens here. */}
            <Stack.Screen name="setup" />
            {/* Staff sign-in needs the server address the kiosk has stored (a kiosk without its key still has it). */}
            <Stack.Protected guard={hasServer}>
              <Stack.Screen name="staff/index" />
              <Stack.Screen name="staff/link-card" />
              <Stack.Screen name="staff/printer" />
              <Stack.Screen name="staff/setup" />
            </Stack.Protected>
          </Stack>
        </KioskShell>
      </InactivityGuard>
      {status === 'offline' && !onSetup ? <OfflineOverlay message={loadError ?? strings.errors.network} onRetry={() => void reload()} /> : null}
    </SafeAreaProvider>
  );
}

/** Immersive mode (system bars hidden, a swipe from the edge shows them briefly), screen kept awake, and the Android Back button. The screen rotates freely. */
function useKioskMode() {
  useKeepAwake();
  const pathname = usePathname();

  useEffect(() => {
    NavigationBar.setHidden(true);
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (hardwareBackAction(pathname) === 'back' && router.canGoBack()) router.back();
      return true; // always handled: the kiosk app is never closed by Back
    });
    return () => sub.remove();
  }, [pathname]);
}

/** Covers the screen below the header band: the logo stays reachable, so staff can still hold it for the staff menu. */
function OfflineOverlay({ message, onRetry }: { message: string; onRetry: () => void }) {
  const insets = useSafeAreaInsets();
  const { headerHeight, gutter, touchMin, type } = useLayout();
  return (
    <View style={[styles.offline, { top: headerHeight + insets.top, paddingHorizontal: gutter }]}>
      <Text style={[styles.offlineTitle, { fontSize: type.title, lineHeight: Math.round(type.title * 1.25) }]}>{strings.offline.title}</Text>
      <Text style={[styles.offlineText, { fontSize: type.body }]}>{message}</Text>
      <Pressable style={[styles.retry, { height: touchMin }]} accessibilityRole="button" onPress={onRetry}>
        <Text style={styles.retryText}>{strings.offline.retry}</Text>
      </Pressable>
      <Text style={[styles.hint, { fontSize: type.label }]}>{strings.offline.staffHint}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offline: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center', gap: 16 },
  offlineTitle: { fontFamily: fonts.bold, color: colors.textPrimary, textAlign: 'center' },
  offlineText: { fontFamily: fonts.regular, color: colors.textSecondary, textAlign: 'center' },
  retry: { backgroundColor: colors.primary, borderRadius: radii.md, paddingHorizontal: 40, justifyContent: 'center' },
  retryText: { fontFamily: fonts.semibold, fontSize: 22, color: '#fff' },
  hint: { fontFamily: fonts.regular, color: colors.textTertiary, textAlign: 'center' },
});
