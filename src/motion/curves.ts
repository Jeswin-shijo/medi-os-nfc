import { Easing, ReduceMotion, type WithTimingConfig } from 'react-native-reanimated';
import { motion } from '../theme/tokens';

/** Exponential ease-out: quick to arrive, gentle to settle. */
export const easeOut = Easing.bezier(...motion.easeOut);

/**
 * Timing for changes that must still happen when the system asks for reduced motion:
 * fades (opacity is not movement) and progress that carries meaning (countdown rings).
 * Reanimated would otherwise jump them straight to the end.
 */
export const always = (duration: number, easing: WithTimingConfig['easing'] = easeOut): WithTimingConfig => ({
  duration,
  easing,
  reduceMotion: ReduceMotion.Never,
});
