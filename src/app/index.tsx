import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { strings } from '../i18n/strings';
import { useKioskApp } from '../store/useKioskApp';
import { colors, fonts } from '../theme/tokens';

// Temporary: Task 19 builds the real welcome screen.
export default function Welcome() {
  const router = useRouter();
  const config = useKioskApp((s) => s.config);
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{config?.hospital.name || strings.welcome.placeholder}</Text>
      <Text style={styles.sub}>{config?.kioskName}</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/setup')}>
        <Text style={styles.link}>{strings.offline.changeSetup}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: colors.background },
  title: { fontFamily: fonts.bold, fontSize: 36, color: colors.textPrimary },
  sub: { fontFamily: fonts.regular, fontSize: 20, color: colors.textSecondary },
  link: { fontFamily: fonts.medium, fontSize: 16, color: colors.primary, marginTop: 24 },
});
