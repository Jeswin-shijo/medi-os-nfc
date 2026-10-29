// Which window height the layout should see (pure: Node tests run it).

/**
 * Normally the window's own height, so split-screen and multi-window report the real, smaller size.
 * While the on-screen keyboard is up the window shrinks under the cursor; the height then never drops
 * below the screen's (for the current orientation), so the layout does not jump while someone types.
 */
export function layoutHeight(window: { width: number; height: number }, screen: { width: number; height: number }, keyboardVisible: boolean): number {
  if (!keyboardVisible) return window.height;
  const screenHeight = window.width > window.height ? Math.min(screen.width, screen.height) : Math.max(screen.width, screen.height);
  return Math.max(window.height, screenHeight);
}
