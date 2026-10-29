import { useEffect } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { colors } from '../theme/tokens';

interface SkeletonProps {
  style?: StyleProp<ViewStyle>;
}

/** A grey placeholder block with a soft light sweeping across it, while real content loads. Still with reduced motion. */
export function Skeleton({ style }: SkeletonProps) {
  const reduced = useReducedMotion();
  const width = useSharedValue(0);
  const t = useSharedValue(0);

  useEffect(() => {
    if (reduced) {
      cancelAnimation(t);
      return;
    }
    t.value = withRepeat(withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }), -1, false);
    return () => cancelAnimation(t);
  }, [reduced, t]);

  const sweep = useAnimatedStyle(() => ({
    width: width.value * 0.45,
    transform: [{ translateX: -width.value * 0.45 + t.value * width.value * 1.45 }],
  }));

  return (
    <View
      style={[styles.block, style]}
      onLayout={(e: LayoutChangeEvent) => {
        width.value = e.nativeEvent.layout.width;
      }}
      importantForAccessibility="no-hide-descendants"
    >
      {reduced ? null : <Animated.View style={[styles.light, sweep]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  light: { position: 'absolute', top: 0, bottom: 0, left: 0, backgroundColor: 'rgba(255, 255, 255, 0.65)' },
});
