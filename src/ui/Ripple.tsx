import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { always, easeOut } from '../motion/curves';
import { colors } from '../theme/tokens';

const RINGS = 3;
const PERIOD_MS = 1800;

interface RippleProps {
  /** Diameter of the outermost ring. */
  size?: number;
  color?: string;
  /** Rings rush outward and vanish once (a card was read). */
  burst?: boolean;
  /** Stop the loop while the screen is covered by another one. */
  paused?: boolean;
  /** Drawn in the middle, above the rings. */
  children?: ReactNode;
}

/**
 * "Tap here": three concentric rings spreading out from the centre, one every 0.6 s
 * (a 1.8 s loop on one shared clock). With reduced motion the rings stand still.
 */
export function Ripple({ size = 240, color = colors.primary, burst = false, paused = false, children }: RippleProps) {
  const reduced = useReducedMotion();
  const clock = useSharedValue(0);
  const burstProgress = useSharedValue(0);

  useEffect(() => {
    if (reduced || paused) {
      cancelAnimation(clock);
      return;
    }
    clock.value = 0;
    clock.value = withRepeat(withTiming(1, { duration: PERIOD_MS, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(clock);
  }, [reduced, paused, clock]);

  useEffect(() => {
    burstProgress.value = burst ? withTiming(1, always(600, easeOut)) : 0;
  }, [burst, burstProgress]);

  return (
    <View style={[styles.box, { width: size, height: size }]}>
      {Array.from({ length: RINGS }, (_, i) => (
        <Ring key={i} index={i} size={size} color={color} clock={clock} burst={burstProgress} still={reduced || paused} />
      ))}
      {children}
    </View>
  );
}

function Ring({
  index,
  size,
  color,
  clock,
  burst,
  still,
}: {
  index: number;
  size: number;
  color: string;
  clock: SharedValue<number>;
  burst: SharedValue<number>;
  still: boolean;
}) {
  const style = useAnimatedStyle(() => {
    // Each ring runs a third of a period behind the one before it.
    const phase = still ? (index + 1) / (RINGS + 1) : (clock.value + index / RINGS) % 1;
    const eased = 1 - (1 - phase) * (1 - phase);
    const fade = still ? 0.5 - index * 0.12 : 0.55 * (1 - phase);
    return {
      opacity: fade * (1 - burst.value),
      transform: [{ scale: (0.42 + 0.58 * eased) * (1 + 0.8 * burst.value) }],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.ring, { width: size, height: size, borderRadius: size / 2, borderColor: color }, style]}
    >
      <View style={[StyleSheet.absoluteFill, { borderRadius: size / 2, backgroundColor: color, opacity: 0.08 }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', borderWidth: 2 },
});
