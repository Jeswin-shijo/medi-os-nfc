import { useWindowDimensions } from 'react-native';
import { layoutFor, type Layout } from './layout';

/** The current layout; the window size changes on rotation, so screens re-render as the device turns. */
export function useLayout(): Layout {
  const { width, height } = useWindowDimensions();
  return layoutFor(width, height);
}
