// No react-native imports.

/** '#1E6BFF' at 12% → 'rgba(30, 107, 255, 0.12)'. Accepts #RGB and #RRGGBB; anything else is returned unchanged. */
export function withAlpha(hex: string, alpha: number): string {
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(hex);
  const long = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  const parts = long ? long.slice(1) : short ? short.slice(1).map((c) => c + c) : null;
  if (!parts) return hex;
  const [r, g, b] = parts.map((p) => parseInt(p, 16));
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
