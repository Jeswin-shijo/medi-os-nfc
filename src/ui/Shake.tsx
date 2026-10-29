import { useCallback } from 'react';
import { useAnimatedStyle, useReducedMotion, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import { always } from '../motion/curves';

/** Decaying side-to-side offsets, 50 ms apart: 300 ms in all. */
const OFFSETS = [-12, 10, -7, 5, -2, 0];

/**
 * "No": a short decaying shake for a wrong code or an unknown card. Put `style` on an
 * Animated.View and call `shake()`. With reduced motion the element dims and recovers instead.
 */
export function useShake() {
  const reduced = useReducedMotion();
  const x = useSharedValue(0);
  const opacity = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }], opacity: opacity.value }));

  const shake = useCallback(() => {
    if (reduced) {
      opacity.set(withSequence(withTiming(0.4, always(90)), withTiming(1, always(180))));
      return;
    }
    x.set(withSequence(...OFFSETS.map((to) => withTiming(to, { duration: 50 }))));
  }, [reduced, x, opacity]);

  return { style, shake };
}
