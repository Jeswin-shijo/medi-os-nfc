import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { colors, typography } from '../theme/tokens';

/** 299 → '4:59'. */
export const formatClock = (seconds: number): string => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/**
 * Whole seconds left of `seconds`, counted from when it was set (a new value restarts it).
 * Calls `onDone` once at zero. Reads the wall clock, so a slow frame never stretches it.
 */
export function useCountdown(seconds: number, onDone?: () => void): number {
  const [left, setLeft] = useState(Math.max(0, Math.ceil(seconds)));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    let finished = false;
    const tick = () => {
      const now = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(now);
      if (now === 0 && !finished) {
        finished = true;
        clearInterval(timer);
        done.current?.();
      }
    };
    const timer = setInterval(tick, 250);
    tick();
    return () => clearInterval(timer);
  }, [seconds]);

  return left;
}

interface CountdownProps {
  seconds: number;
  onDone?: () => void;
  /** 'clock' shows 4:59, 'seconds' shows 59. */
  format?: 'clock' | 'seconds';
  style?: StyleProp<TextStyle>;
}

/** A ticking number in tabular figures (it does not jitter as it counts). */
export function Countdown({ seconds, onDone, format = 'seconds', style }: CountdownProps) {
  const left = useCountdown(seconds, onDone);
  return <Text style={[styles.text, style]}>{format === 'clock' ? formatClock(left) : String(left)}</Text>;
}

const styles = StyleSheet.create({
  text: { ...typography.label, color: colors.textPrimary, fontVariant: ['tabular-nums'] },
});
