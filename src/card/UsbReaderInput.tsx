import { useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, StyleSheet, TextInput } from 'react-native';
import { UsbReaderBuffer } from './cardId';

/** Checked just after the buffer's 120 ms of silence, for readers that send no Enter. */
const SILENCE_CHECK_MS = 140;
/** Long enough for a real text field that took the focus to be the focused one. */
const REFOCUS_DELAY_MS = 80;

const refocusListeners = new Set<() => void>();

/**
 * Asks any mounted reader field to take the focus back (unless a real field has it). For after a
 * screen blurred a text field itself: `keyboardDidHide` does not fire when the keyboard was
 * already hidden, so the field cannot find out alone.
 */
export function refocusCardReader(): void {
  refocusListeners.forEach((listener) => listener());
}

interface UsbReaderInputProps {
  onCard: (cardId: string) => void;
}

/**
 * The USB card reader's way in. The reader is a keyboard, so it needs a focused text field to type
 * into: this one is invisible, keeps the focus (taking it back after a blur unless a real field
 * took it) and never opens the on-screen keyboard. Render it only on a screen that listens for cards.
 */
export function UsbReaderInput({ onCard }: UsbReaderInputProps) {
  const ref = useRef<TextInput>(null);
  const [buffer] = useState(() => new UsbReaderBuffer());
  /** What the field holds, to tell the new keys from the old ones. */
  const held = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refocusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestOnCard = useRef(onCard);

  useEffect(() => {
    latestOnCard.current = onCard;
  }, [onCard]);

  useEffect(() => {
    // Listen from the start, and again when back from the background (a system dialog, the screen waking up).
    focusUnlessTaken(ref.current);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') focusUnlessTaken(ref.current);
    });
    // A real field gave up the focus (staff closed the keyboard): the reader listens again.
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      clearTimeout(refocusTimer.current);
      refocusTimer.current = setTimeout(() => focusUnlessTaken(ref.current), REFOCUS_DELAY_MS);
    });
    const ask = () => {
      clearTimeout(refocusTimer.current);
      refocusTimer.current = setTimeout(() => focusUnlessTaken(ref.current), REFOCUS_DELAY_MS);
    };
    refocusListeners.add(ask);
    return () => {
      refocusListeners.delete(ask);
      sub.remove();
      hide.remove();
      clearTimeout(silenceTimer.current);
      clearTimeout(refocusTimer.current);
    };
  }, []);

  const empty = () => {
    held.current = '';
    ref.current?.clear();
  };

  const take = (keys: string) => {
    const cardId = buffer.push(keys, Date.now());
    if (cardId === null) return;
    empty();
    latestOnCard.current(cardId);
  };

  const onChangeText = (text: string) => {
    const keys = text.startsWith(held.current) ? text.slice(held.current.length) : text;
    held.current = text;
    if (!keys) return;
    take(keys);
    clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => take(''), SILENCE_CHECK_MS);
  };

  const onSubmitEditing = () => {
    clearTimeout(silenceTimer.current);
    take('\n');
    // Whatever was typed is done with, card or not.
    empty();
  };

  const onBlur = () => {
    clearTimeout(refocusTimer.current);
    refocusTimer.current = setTimeout(() => focusUnlessTaken(ref.current), REFOCUS_DELAY_MS);
  };

  return (
    <TextInput
      ref={ref}
      showSoftInputOnFocus={false}
      caretHidden
      contextMenuHidden
      autoCorrect={false}
      autoCapitalize="none"
      autoComplete="off"
      spellCheck={false}
      importantForAutofill="no"
      // No suggestions or word composing: every key reaches onChangeText as it comes.
      keyboardType="visible-password"
      submitBehavior="submit"
      onChangeText={onChangeText}
      onSubmitEditing={onSubmitEditing}
      onBlur={onBlur}
      accessible={false}
      importantForAccessibility="no"
      style={styles.hidden}
    />
  );
}

/** Takes the focus for the reader, but never from a real text field (a search box staff are typing in). */
function focusUnlessTaken(input: TextInput | null): void {
  if (!input || TextInput.State.currentlyFocusedInput()) return;
  input.focus();
}

const styles = StyleSheet.create({
  // Not zero-sized: Android does not focus a view it considers to have no area.
  hidden: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
});
