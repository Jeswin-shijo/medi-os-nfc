import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut, ReduceMotion } from 'react-native-reanimated';
import type { VisitStatus } from '../api/types';
import { useFlow } from '../flow/useFlow';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { colors, motion, radii, shadows, spacing, typography } from '../theme/tokens';
import { Button } from './Button';

/** A small "Reconnecting..." note under a waiting payment screen: the screen keeps asking. */
export function ReconnectNote({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
      exiting={FadeOut.duration(motion.duration.fast).reduceMotion(ReduceMotion.Never)}
      style={styles.note}
      accessibilityLiveRegion="polite"
    >
      <MaterialCommunityIcons name="wifi-sync" size={22} color={colors.warningText} />
      <Text style={styles.noteText}>{strings.pay.reconnecting}</Text>
    </Animated.View>
  );
}

/** The payment ended without money taken (time ran out, or the counter cancelled it): say so, offer the way forward. */
export function ClosedPanel({ status }: { status: VisitStatus }) {
  const expired = status === 'expired';
  const copy = strings.pay.closed;
  const title = expired ? copy.expiredTitle : copy.cancelledTitle;
  const body = expired ? copy.expiredBody : copy.cancelledBody;
  return (
    <View style={styles.screen}>
      <Enter style={styles.panel}>
        <View accessibilityRole="alert" accessible accessibilityLabel={`${title}. ${body}`} style={styles.copy}>
          <View style={styles.icon}>
            <MaterialCommunityIcons name={expired ? 'timer-off-outline' : 'close-circle-outline'} size={52} color={colors.warningText} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>
        </View>
        <Enter index={2} style={styles.actions}>
          <Button label={copy.again} size="large" icon="doctor" onPress={() => router.dismissTo('/doctor')} style={styles.again} />
          <Button label={copy.startOver} variant="quiet" onPress={() => useFlow.getState().resetFlow()} />
        </Enter>
      </Enter>
    </View>
  );
}

const styles = StyleSheet.create({
  note: { flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill, backgroundColor: colors.warningLight },
  noteText: { ...typography.caption, color: colors.warningText },
  screen: { flex: 1, width: '100%', maxWidth: 1480, alignSelf: 'center', padding: spacing.lg },
  panel: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
    borderRadius: radii.lg,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  copy: { alignItems: 'center', gap: spacing.md, maxWidth: 760 },
  icon: { width: 104, height: 104, borderRadius: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.warningLight },
  title: { ...typography.title, color: colors.textPrimary, textAlign: 'center' },
  body: { ...typography.bodyLarge, color: colors.textSecondary, textAlign: 'center' },
  actions: { alignItems: 'center', gap: spacing.sm },
  again: { minWidth: 320 },
});
