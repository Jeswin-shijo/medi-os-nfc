import { useEffect, useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, cancelAnimation, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { always } from '../motion/curves';
import { colors } from '../theme/tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface RingCountdownProps {
  /** Seconds left; the ring empties to nothing over this time. A new value restarts it. */
  seconds: number;
  /** The full ring stands for this many seconds (default: `seconds`), e.g. 300 for a UPI order that is part used. */
  total?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  onDone?: () => void;
  /** Drawn in the middle (usually a `Countdown`). */
  children?: ReactNode;
}

/**
 * Time left as a ring that empties clockwise from the top. The ring is information, not
 * decoration, so it keeps moving with reduced motion (Reanimated would otherwise jump it to empty).
 */
export function RingCountdown({
  seconds,
  total = seconds,
  size = 120,
  strokeWidth = 10,
  color = colors.primary,
  trackColor = colors.primaryLight,
  onDone,
  children,
}: RingCountdownProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const used = useSharedValue(total > 0 ? 1 - seconds / total : 1);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const start = total > 0 ? Math.min(1, Math.max(0, 1 - seconds / total)) : 1;
    used.value = start;
    used.value = withTiming(1, always(Math.max(0, seconds) * 1000, Easing.linear));
    const timer = setTimeout(() => done.current?.(), Math.max(0, seconds) * 1000);
    return () => {
      clearTimeout(timer);
      cancelAnimation(used);
    };
  }, [seconds, total, used]);

  const arcProps = useAnimatedProps(() => ({ strokeDashoffset: circumference * used.value }));

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          animatedProps={arcProps}
          // Start at twelve o'clock; mirrored so the arc shrinks clockwise.
          transform={`rotate(-90 ${size / 2} ${size / 2}) scale(1 -1) translate(0 ${-size})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.centre]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  centre: { alignItems: 'center', justifyContent: 'center' },
});
