// Where to scroll so the focused field shows above the on-screen keyboard (pure: Node tests run it).

/** Space kept between the field and the keyboard (or the top edge). */
export const REVEAL_MARGIN = 16;

/**
 * The scroll offset that brings a field into sight, or null when it is already in sight. All positions are
 * window coordinates (dp): the field's top and height, the scroll view's top, height and current offset, and
 * the keyboard's top edge.
 */
export function revealOffset(
  field: { top: number; height: number },
  view: { top: number; height: number; offset: number },
  keyboardTop: number,
  margin: number = REVEAL_MARGIN,
): number | null {
  const visibleBottom = Math.min(view.top + view.height, keyboardTop);
  const below = field.top + field.height + margin - visibleBottom;
  if (below > 0) return view.offset + below;
  const above = view.top + margin - field.top;
  if (above > 0) return Math.max(0, view.offset - above);
  return null;
}
