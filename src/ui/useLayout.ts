import { useEffect, useState } from 'react';
import { AppState, Dimensions, Keyboard, useWindowDimensions } from 'react-native';
import { layoutFor, type Layout } from './layout';
import { layoutHeight } from './windowHeight';

/** Whether the on-screen keyboard is up (Android has no "will" events, so the "did" ones). */
function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(() => Keyboard.isVisible());
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setVisible(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setVisible(false));
    // A missed keyboardDidHide must not leave the clamp on: look again whenever the app comes back.
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') setVisible(Keyboard.isVisible());
    });
    return () => {
      app.remove();
      show.remove();
      hide.remove();
    };
  }, []);
  return visible;
}

/** The current layout; the window size changes on rotation, so screens re-render as the device turns. */
export function useLayout(): Layout {
  const window = useWindowDimensions();
  const keyboardVisible = useKeyboardVisible();
  return layoutFor(window.width, layoutHeight(window, Dimensions.get('screen'), keyboardVisible));
}
