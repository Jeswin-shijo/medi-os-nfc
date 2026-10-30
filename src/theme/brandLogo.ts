/**
 * MediOS Reception brand mark: single source of truth for the kiosk's launcher icon,
 * splash, favicon and header logo.
 *
 * The MediOS cross (same rounded arms and filleted inner corners as the MediOS app) with
 * three contactless waves rippling out of its right arm: "tap your card here", from the
 * MediOS family. The waves are arcs centred on the right arm, so they read as coming from it.
 *
 * Pure data and string building (no react-native imports): `scripts/generate-icons.js`
 * renders every PNG from `buildLogoSvg`, and a react-native-svg component draws the same
 * mark from `MARK_FULL` / `MARK_HEAVY`.
 */

/** The MediOS palette (identical to the MediOS app's brandLogo.ts). */
export const BRAND = {
  primary: '#1E62F5',
  gradientStart: '#4D8DFF',
  gradientEnd: '#0B36A8',
  /** Mark colour on white (the header tile, a white splash). */
  ink: '#1A56E8',
} as const;

/** The MediOS cross, in mark units (cross centre at 0,0; arm tip to arm tip = 600). */
export const CROSS = {
  /** Centre to arm tip. */
  halfLength: 300,
  /** Half the arm thickness. */
  halfWidth: 130,
  /** Corner radius at the arm tips. */
  outerRadius: 80,
  /** Fillet where two arms meet. */
  innerRadius: 34,
} as const;

/**
 * The contactless waves: concentric arcs opening to the right, stroked with round caps.
 * They share one centre on the right arm (`centerX` from the cross centre), so they grow
 * small, medium, large like the contactless sign: the first hugs the arm's tip and the
 * last ends level with the top and bottom arms.
 * `full` (three waves) holds from the 1024 store icon down to a 48 px launcher icon;
 * `heavy` (two thicker waves) is for marks drawn under `HEAVY_BELOW` px wide (favicons,
 * a 24 px monochrome glyph, the compact header tile).
 */
export const WAVES = {
  full: { centerX: 150, strokeWidth: 84, radii: [248, 388, 528], halfAngleDeg: 30 },
  heavy: { centerX: 150, strokeWidth: 110, radii: [269, 449], halfAngleDeg: 34 },
} as const;

export type MarkVariant = keyof typeof WAVES;

export interface WaveArc {
  /** Arc centre (on the cross's right arm) in viewBox units. */
  cx: number;
  cy: number;
  r: number;
  /** Arc runs from -halfAngleDeg (above) to +halfAngleDeg (below), through 0 (pointing right). */
  startDeg: number;
  endDeg: number;
}

export interface MarkGeometry {
  /** Tight box around the mark, for an <Svg viewBox>. */
  viewBox: string;
  width: number;
  height: number;
  /** Cross centre inside the viewBox. */
  center: { x: number; y: number };
  /** Cross outline: fill it. */
  cross: string;
  /** One path per wave: stroke it with `waveWidth`, round caps, no fill. */
  waves: readonly string[];
  waveWidth: number;
  /** The same waves as circle parameters. */
  waveArcs: readonly WaveArc[];
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Plus sign with rounded outer corners and filleted inner corners, centred on (cx, cy). */
const crossPath = (cx: number, cy: number) => {
  const { halfLength: a, halfWidth: b, outerRadius: ro, innerRadius: ri } = CROSS;
  const v: [number, number, boolean][] = [
    [-b, -a, true], [b, -a, true], [b, -b, false], [a, -b, true], [a, b, true], [b, b, false],
    [b, a, true], [-b, a, true], [-b, b, false], [-a, b, true], [-a, -b, true], [-b, -b, false],
  ];
  const n = v.length;
  let d = '';
  for (let i = 0; i < n; i++) {
    const [x, y, convex] = v[i];
    const [px, py] = v[(i - 1 + n) % n];
    const [nx, ny] = v[(i + 1) % n];
    const r = convex ? ro : ri;
    const inLen = Math.hypot(px - x, py - y);
    const outLen = Math.hypot(nx - x, ny - y);
    const p1x = x + ((px - x) / inLen) * r;
    const p1y = y + ((py - y) / inLen) * r;
    const p2x = x + ((nx - x) / outLen) * r;
    const p2y = y + ((ny - y) / outLen) * r;
    d += `${i === 0 ? 'M' : 'L'}${r1(cx + p1x)} ${r1(cy + p1y)} A${r} ${r} 0 0 ${convex ? 1 : 0} ${r1(cx + p2x)} ${r1(cy + p2y)} `;
  }
  return `${d}Z`;
};

const buildGeometry = (variant: MarkVariant): MarkGeometry => {
  const { centerX, strokeWidth, radii, halfAngleDeg } = WAVES[variant];
  const t = (halfAngleDeg * Math.PI) / 180;
  const cap = strokeWidth / 2;
  const outer = radii[radii.length - 1];
  // Box: cross's left tip to the outer wave's crest; tallest of the cross and the outer wave.
  const halfHeight = Math.ceil(Math.max(CROSS.halfLength, outer * Math.sin(t) + cap));
  const width = Math.ceil(CROSS.halfLength + centerX + outer + cap);
  const height = halfHeight * 2;
  const cx = CROSS.halfLength;
  const cy = halfHeight;
  const wx = cx + centerX;
  const waveArcs = radii.map((r) => ({ cx: wx, cy, r, startDeg: -halfAngleDeg, endDeg: halfAngleDeg }));
  const waves = radii.map((r) => {
    const x = r1(wx + r * Math.cos(t));
    return `M${x} ${r1(cy - r * Math.sin(t))} A${r} ${r} 0 0 1 ${x} ${r1(cy + r * Math.sin(t))}`;
  });
  return {
    viewBox: `0 0 ${width} ${height}`,
    width,
    height,
    center: { x: cx, y: cy },
    cross: crossPath(cx, cy),
    waves,
    waveWidth: strokeWidth,
    waveArcs,
  };
};

export const MARK_FULL: MarkGeometry = buildGeometry('full');
export const MARK_HEAVY: MarkGeometry = buildGeometry('heavy');

/** Draw `MARK_HEAVY` when the mark itself is narrower than this (px or dp). */
export const HEAVY_BELOW = 32;

/** The geometry to draw for a mark this wide (px or dp). */
export const markForWidth = (width: number): MarkGeometry => (width < HEAVY_BELOW ? MARK_HEAVY : MARK_FULL);

export interface LogoOptions {
  /** Output size in px (the drawing is always on a 1024 grid). */
  size?: number;
  /** 'gradient' (the MediOS blue tile), 'none' (transparent), or a CSS colour for a flat tile. */
  background?: 'gradient' | 'none' | (string & {});
  /** Tile corner radius on the 1024 grid (0 = square, e.g. the iOS icon). */
  cornerRadius?: number;
  /** Mark colour. Default white. */
  foreground?: string;
  /** Flat single colour: no shadow, no glow (Android themed icon, notification glyph). */
  monochrome?: boolean;
  /** Two heavier waves, for marks drawn under `HEAVY_BELOW` px wide. */
  heavy?: boolean;
  /**
   * Clear space on each side of the mark, as a share of the canvas (0.13 = the mark's width
   * is 74% of the canvas). Android's adaptive foreground uses ~0.26 so the mark sits inside
   * the 66 dp safe circle and matches the tile icon once the launcher masks it.
   */
  padding?: number;
  /** Soft drop shadow under the mark. Default: on for the gradient tile, off otherwise. */
  shadow?: boolean;
  /** Draw the mark (false = background only, e.g. Android's adaptive background layer). */
  mark?: boolean;
}

const GRID = 1024;

export const buildLogoSvg = ({
  size = 1024,
  background = 'gradient',
  cornerRadius = 0,
  foreground = '#FFFFFF',
  monochrome = false,
  heavy = false,
  padding = 0.13,
  shadow,
  mark: drawMark = true,
}: LogoOptions = {}): string => {
  const g = heavy ? MARK_HEAVY : MARK_FULL;
  const withShadow = !monochrome && (shadow ?? background === 'gradient');
  const scale = (GRID * (1 - 2 * padding)) / Math.max(g.width, g.height);
  const tx = r1((GRID - g.width * scale) / 2);
  const ty = r1((GRID - g.height * scale) / 2);

  const defs: string[] = [];
  let tile = '';
  if (background === 'gradient') {
    defs.push(
      `<linearGradient id="mr-bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${BRAND.gradientStart}"/><stop offset="0.5" stop-color="${BRAND.primary}"/><stop offset="1" stop-color="${BRAND.gradientEnd}"/></linearGradient>`
    );
    tile = `<rect width="${GRID}" height="${GRID}" rx="${cornerRadius}" fill="url(#mr-bg)"/>`;
    if (!monochrome) {
      defs.push(
        `<radialGradient id="mr-glow" cx="0.25" cy="0.15" r="0.75"><stop offset="0" stop-color="#FFFFFF" stop-opacity="0.22"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/></radialGradient>`
      );
      tile += `<rect width="${GRID}" height="${GRID}" rx="${cornerRadius}" fill="url(#mr-glow)"/>`;
    }
  } else if (background !== 'none') {
    tile = `<rect width="${GRID}" height="${GRID}" rx="${cornerRadius}" fill="${background}"/>`;
  }
  if (withShadow) {
    defs.push(
      `<filter id="mr-shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="18" stdDeviation="22" flood-color="#041A55" flood-opacity="0.35"/></filter>`
    );
  }

  const waves = g.waves
    .map((d) => `<path d="${d}" fill="none" stroke="${foreground}" stroke-width="${g.waveWidth}" stroke-linecap="round"/>`)
    .join('');
  const markSvg = drawMark
    ? `<g${withShadow ? ' filter="url(#mr-shadow)"' : ''}><g transform="translate(${tx} ${ty}) scale(${Math.round(scale * 1e5) / 1e5})"><path d="${g.cross}" fill="${foreground}"/>${waves}</g></g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${GRID} ${GRID}"><title>MediOS Reception</title>${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${tile}${markSvg}</svg>`;
};
