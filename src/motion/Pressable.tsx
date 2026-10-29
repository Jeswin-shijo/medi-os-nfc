import type { ReactNode } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { motion } from '../theme/tokens';
import { always } from './curves';
import { feedback } from './feedback';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface PressableScaleProps extends Omit<PressableProps, 'style' | 'children'> {
  children?: ReactNode;
  /** The visual container (background, radius, padding, size): it is what scales. */
  style?: StyleProp<ViewStyle>;
  /** 'light': a tick (haptic and soft chime) on press-in. */
  haptic?: 'light' | 'none';
  /** Wash laid over the control while pressed; null for none. */
  highlight?: string | null;
  /** Scale while held down. */
  pressedScale?: number;
}

/**
 * The kiosk's one touchable: springs to 0.97 on press-in and back on release, washes with a
 * highlight, and ticks. With reduced motion it only washes. Every button, tile, key and row uses it.
 */
export function PressableScale({
  children,
  style,
  haptic = 'light',
  highlight = 'rgba(15, 23, 42, 0.06)',
  pressedScale = motion.pressScale,
  disabled,
  onPressIn,
  onPressOut,
  accessibilityRole = 'button',
  accessibilityState,
  ...rest
}: PressableScaleProps) {
  const reduced = useReducedMotion();
  const pressed = useSharedValue(0);

  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : interpolate(pressed.value, [0, 1], [1, pressedScale]) }],
  }));
  const washStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, Math.max(0, pressed.value)) }));

  const settle = (to: 0 | 1) => {
    pressed.set(reduced ? withTiming(to, always(to ? 80 : motion.duration.fast)) : withSpring(to, motion.spring.press));
  };

  const handlePressIn = (e: GestureResponderEvent) => {
    settle(1);
    if (haptic === 'light') feedback.tap();
    onPressIn?.(e);
  };
  const handlePressOut = (e: GestureResponderEvent) => {
    settle(0);
    onPressOut?.(e);
  };

  const radius = StyleSheet.flatten(style)?.borderRadius;

  return (
    <AnimatedPressable
      {...rest}
      disabled={disabled}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled, ...accessibilityState }}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, scaleStyle]}
    >
      {children}
      {highlight ? (
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: highlight, borderRadius: radius }, washStyle]} />
      ) : null}
    </AnimatedPressable>
  );
}
