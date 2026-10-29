// No react-native imports: tested in plain Node.
import { create } from 'qrcode';

export interface QrModules {
  size: number;
  get(row: number, col: number): boolean;
}

/** The module matrix of a QR code for `value` (error correction M: sturdy, still small). */
export function qrMatrix(value: string): QrModules {
  const { modules } = create(value, { errorCorrectionLevel: 'M' });
  return { size: modules.size, get: (row, col) => Boolean(modules.get(row, col)) };
}

/**
 * One SVG path for every dark module, one rectangle per horizontal run, in module units
 * shifted by `margin` (the quiet zone). Drawn with viewBox `0 0 size+2m size+2m`.
 */
export function qrPath(qr: QrModules, margin: number): string {
  let d = '';
  for (let row = 0; row < qr.size; row++) {
    let col = 0;
    while (col < qr.size) {
      if (!qr.get(row, col)) {
        col++;
        continue;
      }
      const start = col;
      while (col < qr.size && qr.get(row, col)) col++;
      const run = col - start;
      d += `M${start + margin} ${row + margin}h${run}v1h-${run}z`;
    }
  }
  return d;
}
