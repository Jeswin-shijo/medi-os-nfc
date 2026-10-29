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
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { strings } from '../i18n/strings';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts, radii } from '../theme/tokens';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const onSetup = (useSegments() as string[])[0] === 'setup';
  const [fontsLoaded, fontError] = useFonts({ IBMPlexSans_400Regular, IBMPlexSans_500Medium, IBMPlexSans_600SemiBold, IBMPlexSans_700Bold });
  const { status, loadError, reload } = useKioskApp();

  useEffect(() => {
    void reload();
  }, [reload]);

  const ready = (fontsLoaded || fontError) && status !== 'loading';
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      {/* The welcome screen needs a configured kiosk; without one, navigation falls back to /setup. */}
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Protected guard={status === 'ready' || status === 'offline'}>
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Screen name="setup" />
      </Stack>
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
