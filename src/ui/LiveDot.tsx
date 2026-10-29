import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/tokens';

interface LiveDotProps {
  color?: string;
  size?: number;
  /** Stop the pulse while the screen is covered by another one. */
  paused?: boolean;
}

/** "Live" marker for "Available now": a dot with a soft halo breathing out every 1.4 s. Static with reduced motion. */
export function LiveDot({ color = colors.successBright, size = 10, paused = false }: LiveDotProps) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced || paused) {
      cancelAnimation(t);
      t.value = 0;
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, paused, t]);

  const halo = useAnimatedStyle(() => ({
    opacity: reduced || paused ? 0 : 0.5 * (1 - t.value),
    transform: [{ scale: 1 + 1.6 * t.value }],
  }));

  const round = { width: size, height: size, borderRadius: size / 2, backgroundColor: color };
  return (
    <View style={{ width: size, height: size }} importantForAccessibility="no-hide-descendants">
      <Animated.View style={[StyleSheet.absoluteFill, round, halo]} />
      <View style={round} />
    </View>
  );
}
