import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeIn, FadeInDown, ReduceMotion, useReducedMotion } from 'react-native-reanimated';
import { motion } from '../theme/tokens';
import { easeOut } from './curves';

interface EnterProps {
  children?: ReactNode;
  /** Position among siblings entering together: each waits 40 ms more (capped at 8). */
  index?: number;
  /** Extra wait before this group starts, ms. */
  delay?: number;
  style?: StyleProp<ViewStyle>;
}

/** Fades in and rises 12 dp over 220 ms; with reduced motion it only fades. */
export function Enter({ children, index = 0, delay = 0, style }: EnterProps) {
  const reduced = useReducedMotion();
  const wait = delay + Math.min(index, motion.staggerMax) * motion.stagger;
  const entering = reduced
    ? FadeIn.duration(motion.duration.base).delay(wait).reduceMotion(ReduceMotion.Never)
    : FadeInDown.duration(motion.duration.base)
        .delay(wait)
        .easing(easeOut)
        .withInitialValues({ opacity: 0, transform: [{ translateY: motion.rise }] });
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
