import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming, type SharedValue } from 'react-native-reanimated';
import { strings } from '../i18n/strings';
import { Enter } from '../motion/Enter';
import { colors, typography } from '../theme/tokens';
import { Button } from './Button';

type StatusPanelProps =
  | { state: 'loading'; message?: string; style?: StyleProp<ViewStyle> }
  | { state: 'error'; title?: string; message: string; onRetry?: () => void; retryLabel?: string; style?: StyleProp<ViewStyle> };

/** Fills a screen's content area while it loads, or when loading failed, with a way to try again. */
export function StatusPanel(props: StatusPanelProps) {
  if (props.state === 'loading') {
    return (
      <View style={[styles.panel, props.style]} accessibilityRole="progressbar" accessibilityLabel={props.message ?? strings.status.loading}>
        <WaitingDots />
        <Text style={styles.message}>{props.message ?? strings.status.loading}</Text>
      </View>
    );
  }
  return (
    <View style={[styles.panel, props.style]} accessibilityRole="alert">
      <Enter>
        <View style={styles.errorIcon}>
          <MaterialCommunityIcons name="alert-circle-outline" size={44} color={colors.dangerStrong} />
        </View>
      </Enter>
      <Enter index={1} style={styles.copy}>
        <Text style={styles.title}>{props.title ?? strings.status.errorTitle}</Text>
        <Text style={styles.message}>{props.message}</Text>
      </Enter>
      {props.onRetry ? (
        <Enter index={2}>
          <Button label={props.retryLabel ?? strings.status.retry} icon="refresh" onPress={props.onRetry} />
        </Enter>
      ) : null}
    </View>
  );
}

interface WaitingDotsProps {
  color?: string;
  size?: number;
}

/** Three dots that brighten in turn: "working on it". Still dots with reduced motion. */
export function WaitingDots({ color = colors.primary, size = 14 }: WaitingDotsProps) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.value = withRepeat(withTiming(1, { duration: 1200, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, t]);
  return (
    <View style={styles.dots} importantForAccessibility="no-hide-descendants">
      {[0, 1, 2].map((i) => (
        <Dot key={i} index={i} t={t} still={reduced} color={color} size={size} />
      ))}
    </View>
  );
}

function Dot({ index, t, still, color, size }: { index: number; t: SharedValue<number>; still: boolean; color: string; size: number }) {
  const style = useAnimatedStyle(() => {
    if (still) return { opacity: 0.35 + index * 0.25, transform: [{ scale: 1 }] };
    // Each dot peaks a fifth of a cycle after the one before it.
    const phase = (t.value - index * 0.2 + 1) % 1;
    const wave = phase < 0.4 ? Math.sin((phase / 0.4) * Math.PI) : 0;
    return { opacity: 0.3 + 0.7 * wave, transform: [{ scale: 0.8 + 0.3 * wave }] };
  });
  return <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  panel: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 40 },
  copy: { alignItems: 'center', gap: 8, maxWidth: 640 },
  errorIcon: { width: 88, height: 88, borderRadius: 44, backgroundColor: colors.dangerLight, alignItems: 'center', justifyContent: 'center' },
  title: { ...typography.headline, color: colors.textPrimary, textAlign: 'center' },
  message: { ...typography.body, color: colors.textSecondary, textAlign: 'center' },
  dots: { flexDirection: 'row', gap: 10, height: 24, alignItems: 'center' },
});
