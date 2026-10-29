import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  FadeIn,
  ReduceMotion,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { easeOut } from '../motion/curves';
import { colors, motion } from '../theme/tokens';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The tick in a 100×100 box; its length is about 60 units.
const CHECK = 'M29 52 L44 66 L72 36';
const CHECK_LENGTH = 62;
const DOTS = 8;
const DOT_COLORS = [colors.successBright, colors.primary, colors.warning, colors.purple];

interface CheckBurstProps {
  /** The whole box; the green disc is 60% of it, the dots fly out to its edge. */
  size?: number;
  color?: string;
}

/**
 * "Done": the disc springs in, the tick draws itself (450 ms), a halo spreads and eight dots
 * burst outward; all within 900 ms. With reduced motion a still tick fades in.
 */
export function CheckBurst({ size = 200, color = colors.successBright }: CheckBurstProps) {
  const reduced = useReducedMotion();
  const disc = size * 0.6;
  const pop = useSharedValue(0);
  const draw = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    pop.value = withSpring(1, motion.spring.pop);
    draw.value = withDelay(180, withTiming(1, { duration: 450, easing: easeOut }));
    burst.value = withDelay(320, withTiming(1, { duration: 560, easing: easeOut }));
  }, [reduced, pop, draw, burst]);

  const discStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, pop.value * 1.6),
    transform: [{ scale: 0.4 + 0.6 * pop.value }],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: 0.35 * (1 - burst.value) * (burst.value > 0 ? 1 : 0),
    transform: [{ scale: 1 + 0.55 * burst.value }],
  }));
  const tickProps = useAnimatedProps(() => ({ strokeDashoffset: CHECK_LENGTH * (1 - draw.value) }));

  const tick = (
    <Svg width={disc} height={disc} viewBox="0 0 100 100">
      <AnimatedPath
        d={CHECK}
        stroke={colors.textOnColor}
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        strokeDasharray={CHECK_LENGTH}
        animatedProps={reduced ? undefined : tickProps}
      />
    </Svg>
  );

  if (reduced) {
    return (
      <Animated.View
        entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)}
        style={[styles.box, { width: size, height: size }]}
        accessibilityRole="image"
      >
        <View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: color }]}>{tick}</View>
      </Animated.View>
    );
  }

  return (
    <View style={[styles.box, { width: size, height: size }]} accessibilityRole="image">
      <Animated.View style={[styles.abs, { width: disc, height: disc, borderRadius: disc / 2, borderColor: color }, styles.halo, haloStyle]} />
      {Array.from({ length: DOTS }, (_, i) => (
        <Dot key={i} index={i} size={size} disc={disc} progress={burst} />
      ))}
      <Animated.View style={[styles.disc, { width: disc, height: disc, borderRadius: disc / 2, backgroundColor: color }, discStyle]}>{tick}</Animated.View>
    </View>
  );
}

function Dot({ index, size, disc, progress }: { index: number; size: number; disc: number; progress: SharedValue<number> }) {
  const angle = (index / DOTS) * 2 * Math.PI - Math.PI / 2;
  const dot = Math.max(8, size * 0.05);
  const from = disc / 2 + dot;
  const to = size / 2 - dot / 2;
  const style = useAnimatedStyle(() => {
    const r = from + (to - from) * progress.value;
    return {
      opacity: progress.value === 0 ? 0 : 1 - progress.value * progress.value,
      transform: [{ translateX: Math.cos(angle) * r }, { translateY: Math.sin(angle) * r }, { scale: 1 - 0.5 * progress.value }],
    };
  });
  return (
    <Animated.View
      style={[styles.abs, { width: dot, height: dot, borderRadius: dot / 2, backgroundColor: DOT_COLORS[index % DOT_COLORS.length] }, style]}
    />
  );
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center' },
  abs: { position: 'absolute' },
  halo: { borderWidth: 6 },
  disc: { alignItems: 'center', justifyContent: 'center', boxShadow: '0px 10px 24px rgba(5, 150, 105, 0.28)' },
});
