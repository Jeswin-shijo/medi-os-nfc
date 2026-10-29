import { Dimensions, useWindowDimensions } from 'react-native';
import { layoutFor, type Layout } from './layout';

/** The current layout; the window size changes on rotation, so screens re-render as the device turns. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  // The on-screen keyboard shrinks the window on Android; the layout must not jump under the cursor,
  // so the height never drops below the screen's (matching the current orientation).
  const screen = Dimensions.get('screen');
  const screenHeight = width > height ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  return layoutFor(width, Math.max(height, screenHeight));
}
