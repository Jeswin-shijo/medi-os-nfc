import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { spacing } from '../theme/tokens';
import { Screen } from './Screen';
import { useLayout } from './useLayout';

interface PickFrameProps {
  header: ReactNode;
  footer: ReactNode;
  /** The grid of cards: scrolls on its own between a fixed header and footer, or with the whole page on a short window. */
  children: ReactNode;
  /** The children are a grid (scrolls); false for a status panel that fills the space. */
  grid?: boolean;
  /** A note shown in the flow under the page (never over the cards). */
  notice?: ReactNode;
  /** Drawn over the page, pointer-transparent (a toast on tablets). */
  overlay?: ReactNode;
}

/**
 * The frame of a choosing screen (department, doctor). Normally the heading and the Back button stay put and the
 * cards scroll between them; a short window (a phone on its side) has no height to spare, so the whole page scrolls.
 */
export function PickFrame({ header, footer, children, grid = false, notice, overlay }: PickFrameProps) {
  const layout = useLayout();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.root}>
      {layout.short ? (
        <Screen style={styles.page}>
          {header}
          {children}
          <View style={styles.footer}>{footer}</View>
        </Screen>
      ) : (
        <View
          style={[
            styles.frame,
            {
              maxWidth: layout.contentMax,
              paddingLeft: layout.gutter + insets.left,
              paddingRight: layout.gutter + insets.right,
              paddingBottom: (layout.size === 'compact' ? spacing.md : spacing.lg) + (notice ? 0 : insets.bottom),
              gap: layout.size === 'compact' ? spacing.md : spacing.lg,
            },
          ]}
        >
          {header}
          {grid ? (
            <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
              {children}
            </ScrollView>
          ) : (
            children
          )}
          {footer}
        </View>
      )}
      {notice ? (
        <View style={{ paddingHorizontal: layout.gutter + Math.max(insets.left, insets.right), paddingBottom: spacing.md + insets.bottom }}>{notice}</View>
      ) : null}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  frame: { flex: 1, width: '100%', alignSelf: 'center', paddingTop: spacing.sm },
  // Clipped at its own edges: with overflow visible the cards scrolled over the heading and the Back button
  // when the grid was taller than the window (a small tablet on its side). The view reaches 12 dp into the
  // gutters, and the content pads them back, so card shadows and the selected card's lift are not cut.
  scroll: { flex: 1, marginHorizontal: -12 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: spacing.md },
  page: { gap: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'flex-start', marginTop: 'auto' },
});
