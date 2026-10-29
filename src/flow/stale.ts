// No react-native or expo imports here: the tests run in plain Node.

/**
 * Call when a request starts; the returned function says, once the answer arrives, whether to
 * throw it away: the screen has gone, or the kiosk started over (the flow generation moved on),
 * so the answer belongs to someone who is no longer there.
 */
export function makeStaleCheck(generation: () => number, mounted: () => boolean): () => boolean {
  const captured = generation();
  return () => !mounted() || generation() !== captured;
}
