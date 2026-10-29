import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { Keyboard, TextInput, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView } from 'react-native';
import { revealOffset } from './keyboardReveal';

/**
 * The kiosk is immersive, so Android shows the keyboard over the window instead of resizing it. A form makes
 * room with padding (KeyboardAvoidingView), but nothing brings the field the patient tapped into sight: a
 * field low on a phone stays under the keyboard. When the keyboard comes up (and again when the scroll view
 * shrinks for it), a focused field inside this scroll view is scrolled to just above the keyboard.
 * Spread the returned props on the ScrollView.
 */
export function useKeyboardReveal(scroll: RefObject<ScrollView | null>) {
  const offset = useRef(0);
  const keyboardTop = useRef<number | null>(null);

  const reveal = useCallback(() => {
    const top = keyboardTop.current;
    const view = scroll.current?.getNativeScrollRef();
    const field = TextInput.State.currentlyFocusedInput();
    if (top === null || !view || !field) return;
    // Only a field inside this scroll view: a screen further down the stack keeps its own.
    field.measureLayout(
      view,
      () =>
        view.measureInWindow((_vx, viewTop, _vw, viewHeight) =>
          field.measureInWindow((_fx, fieldTop, _fw, fieldHeight) => {
            const next = revealOffset({ top: fieldTop, height: fieldHeight }, { top: viewTop, height: viewHeight, offset: offset.current }, top);
            if (next !== null) scroll.current?.scrollTo({ y: next, animated: true });
          }),
        ),
      () => undefined,
    );
  }, [scroll]);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (event) => {
      keyboardTop.current = event.endCoordinates.screenY;
      requestAnimationFrame(reveal);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      keyboardTop.current = null;
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [reveal]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    offset.current = event.nativeEvent.contentOffset.y;
  }, []);
  // The keyboard's padding shrinks the scroll view a moment after the keyboard shows: try again with the room there is now.
  const onLayout = useCallback(() => {
    if (keyboardTop.current !== null) reveal();
  }, [reveal]);

  return { onScroll, onLayout, scrollEventThrottle: 16 } as const;
}
