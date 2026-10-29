import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';
import Animated, { FadeIn, ReduceMotion, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { easeOut } from '../motion/curves';
import { motion } from '../theme/tokens';

// Two rounds of 0–9: every digit rolls a full round upward into place on first show.
const WHEEL = Array.from({ length: 20 }, (_, i) => String(i % 10));
const ROLL_MS = 700;
const STAGGER_MS = 70;
const MAX_STAGGERED = 3;

interface RollingNumberProps {
  /** Shown as is; only its digits roll ('G-024', '4821', '₹300'). */
  value: string;
  /** Text style: font, size, colour. The line height sets the wheel's window. */
  style?: StyleProp<TextStyle>;
  /** Wait before rolling, ms. */
  delay?: number;
}

/**
 * Digits roll up into place like a counter (token numbers, the cash code), left to right.
 * With reduced motion the value fades in instead.
 */
export function RollingNumber({ value, style, delay = 0 }: RollingNumberProps) {
  const reduced = useReducedMotion();
  const flat = StyleSheet.flatten(style) ?? {};
  const lineHeight = flat.lineHeight ?? Math.round((flat.fontSize ?? 20) * 1.25);
  const textStyle: StyleProp<TextStyle> = [style, styles.tabular, { lineHeight, height: lineHeight }];

  if (reduced) {
    return (
      <Animated.Text key={value} entering={FadeIn.duration(motion.duration.base).reduceMotion(ReduceMotion.Never)} style={textStyle}>
        {value}
      </Animated.Text>
    );
  }

  let digitIndex = 0;
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={value}>
      {[...value].map((char, i) =>
        /\d/.test(char) ? (
          <DigitWheel
            key={i}
            digit={Number(char)}
            lineHeight={lineHeight}
            textStyle={textStyle}
            delay={delay + Math.min(digitIndex++, MAX_STAGGERED) * STAGGER_MS}
          />
        ) : (
          <Text key={i} style={textStyle} importantForAccessibility="no">
            {char}
          </Text>
        ),
      )}
    </View>
  );
}

function DigitWheel({ digit, lineHeight, textStyle, delay }: { digit: number; lineHeight: number; textStyle: StyleProp<TextStyle>; delay: number }) {
  // Wheel row shown; starts one round below the target so the first show rolls a full turn.
  const position = useSharedValue(digit);
  const shown = useRef(digit);

  useEffect(() => {
    // Rolling from row `from` to `10 + digit` always moves upward, whatever the old digit was.
    const from = shown.current % 10;
    shown.current = 10 + digit;
    position.value = from;
    position.value = withDelay(delay, withTiming(10 + digit, { duration: ROLL_MS, easing: easeOut }));
  }, [digit, delay, position]);

  const wheelStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -position.value * lineHeight }] }));

  return (
    <View style={{ height: lineHeight, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants">
      <Animated.View style={wheelStyle}>
        {WHEEL.map((d, i) => (
          <Text key={i} style={textStyle}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  tabular: { fontVariant: ['tabular-nums'], includeFontPadding: false, textAlignVertical: 'center' },
});
