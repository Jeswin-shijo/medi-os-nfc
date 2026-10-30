import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Keyboard, StyleSheet, TextInput, type HostInstance } from 'react-native';
import { UsbReaderBuffer, type ReaderHabits } from './cardId';

/** Checked just after the buffer's 120 ms of silence, for readers that send no Enter. */
const SILENCE_CHECK_MS = 140;
/** Long enough for a real text field that took the focus to be the focused one. */
const REFOCUS_DELAY_MS = 80;
/** How often a reader field checks whether the focus has come free without anything announcing it. */
const FOCUS_CHECK_MS = 250;

/** One for the app: once the reader has ended an id with Enter, every screen's field waits for the Enter. */
const readerHabits: ReaderHabits = { sendsEnter: false };

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
  const [buffer] = useState(() => new UsbReaderBuffer(readerHabits));
  /** What the field holds, to tell the new keys from the old ones. */
  const held = useRef('');
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const refocusTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestOnCard = useRef(onCard);

  useEffect(() => {
    latestOnCard.current = onCard;
  }, [onCard]);

  /** Whether this field has put away an on-screen keyboard left up by a field that went (once per screen visit). */
  const keyboardPutAway = useRef(false);

  /** Takes the focus for the reader, but never from a real text field (a search box staff are typing in). */
  const takeFocus = useCallback(() => {
    const input = ref.current;
    if (!input || focusedField()) return;
    input.focus();
    // A field that went away with the keyboard up (Start over on Register) leaves the keyboard over this screen,
    // and focusing this field, which never shows one, does not put it away. A blur does; onBlur then takes the
    // focus back. Once only: `Keyboard.isVisible()` can stay true after a missed hide event.
    if (Keyboard.isVisible() && !keyboardPutAway.current) {
      keyboardPutAway.current = true;
      input.blur();
    }
  }, []);

  /** Takes the focus back shortly, unless a real field took it meanwhile. */
  const refocusSoon = useCallback(() => {
    clearTimeout(refocusTimer.current);
    refocusTimer.current = setTimeout(takeFocus, REFOCUS_DELAY_MS);
  }, [takeFocus]);

  useEffect(() => {
    // Listen from the start, and again when back from the background (a system dialog, the screen waking up).
    takeFocus();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') takeFocus();
    });
    // A real field gave up the focus (staff closed the keyboard): the reader listens again.
    const hide = Keyboard.addListener('keyboardDidHide', refocusSoon);
    refocusListeners.add(refocusSoon);
    // Some ways the focus comes free announce nothing: the screen before this one left a field focused and is
    // still fading out when this field starts listening, then goes. Check now and then.
    const watch = setInterval(() => {
      if (!focusedField()) refocusSoon();
    }, FOCUS_CHECK_MS);
    return () => {
      refocusListeners.delete(refocusSoon);
      sub.remove();
      hide.remove();
      clearInterval(watch);
      clearTimeout(silenceTimer.current);
      clearTimeout(refocusTimer.current);
    };
  }, [takeFocus, refocusSoon]);

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
      onBlur={refocusSoon}
      accessible={false}
      importantForAccessibility="no"
      style={styles.hidden}
    />
  );
}

/**
 * The text field that has the focus, if it is still on screen. React Native unregisters a field that
 * unmounts while focused before it blurs it, so the field stays recorded as focused for good (a patient
 * leaving Register with the keyboard up when Start over or the idle reset fires; a reader field whose
 * screen moved on after a card): it holds nothing, so it does not count.
 */
function focusedField(): HostInstance | null {
  const focused = TextInput.State.currentlyFocusedInput() as HostInstance | null;
  return focused && focused.isConnected !== false ? focused : null;
}

const styles = StyleSheet.create({
  // Not zero-sized: Android does not focus a view it considers to have no area.
  hidden: { position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0, pointerEvents: 'none' },
});
