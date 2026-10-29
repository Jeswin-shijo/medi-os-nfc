import { useEffect, useRef, type ReactNode } from 'react';
import { ScrollView, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { useLayout } from './useLayout';

/**
 * The frame of an identification screen: side gutters from the layout, up to the widest content,
 * and a scroll view so a short window (a phone on its side, a keyboard up) scrolls instead of clipping.
 * Children with `flex: 1` fill the window when there is room; give them a `minHeight` for when there is not.
 */
export function Screen({ children, style, resetKey }: { children: ReactNode; style?: StyleProp<ViewStyle>; /** Scrolls back to the top when this changes. */ resetKey?: unknown }) {
  const layout = useLayout();
  const scroll = useRef<ScrollView>(null);
  useEffect(() => scroll.current?.scrollTo({ y: 0, animated: false }), [resetKey]);
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      ref={scroll}
      style={{ flex: 1 }}
      contentContainerStyle={[
        {
          flexGrow: 1,
          width: '100%',
          maxWidth: layout.contentMax,
          alignSelf: 'center',
          paddingLeft: layout.gutter + insets.left,
          paddingRight: layout.gutter + insets.right,
          paddingTop: layout.short ? spacing.xs : spacing.sm,
          paddingBottom: (layout.short ? spacing.md : spacing.lg) + insets.bottom,
          gap: layout.short ? spacing.md : layout.size === 'compact' ? spacing.md : spacing.lg,
        },
        style,
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );
}
