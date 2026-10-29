import { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';
import { strings } from '../i18n/strings';
import { qrMatrix, qrPath } from '../lib/qrPath';
import { always } from '../motion/curves';
import { colors, motion } from '../theme/tokens';

interface QrViewProps {
  value: string;
  /** Edge length in dp, quiet zone included. */
  size?: number;
  color?: string;
  /** Light border around the code in modules (scanners want some white). */
  margin?: number;
  accessibilityLabel?: string;
}

/** A QR code drawn as one SVG path (crisp at any size), scaling in when it appears. */
export function QrView({ value, size = 320, color = colors.navy, margin = 2, accessibilityLabel = strings.qr.label }: QrViewProps) {
  const reduced = useReducedMotion();
  const { path, extent } = useMemo(() => {
    const qr = qrMatrix(value);
    return { path: qrPath(qr, margin), extent: qr.size + margin * 2 };
  }, [value, margin]);

  const shown = useSharedValue(0);
  useEffect(() => {
    shown.value = 0;
    shown.value = reduced ? withTiming(1, always(motion.duration.base)) : withSpring(1, motion.spring.settle);
  }, [value, reduced, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 1.5),
    transform: [{ scale: reduced ? 1 : 0.86 + 0.14 * shown.value }],
  }));

  return (
    <Animated.View style={style} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size} viewBox={`0 0 ${extent} ${extent}`}>
          <Rect x={0} y={0} width={extent} height={extent} fill="#FFFFFF" />
          <Path d={path} fill={color} />
        </Svg>
      </View>
    </Animated.View>
  );
}
