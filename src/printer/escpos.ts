// ESC/POS commands for an 80 mm slip printer. No react-native imports: tested in plain Node.

/** Characters per line on 80 mm paper in the printer's normal font. */
export const COLUMNS = 48;

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

/** GS ( k: the printer's own QR code commands (function 165 onwards). */
const QR = [GS, 0x28, 0x6b] as const;

const ALIGN = { left: 0, center: 1, right: 2 } as const;
export type Align = keyof typeof ALIGN;
export type Scale = 1 | 2 | 3;

/**
 * Text exactly as the printer shows it: `₹` becomes `Rs.` (printers have no rupee glyph); anything
 * else outside printable ASCII becomes `?`, control characters included, so no text (a patient's
 * name, a footer typed in settings) can ever smuggle a printer command onto the slip.
 */
export function printable(text: string): string {
  let out = '';
  for (const char of text) {
    if (char === '₹') out += 'Rs.';
    else {
      const code = char.charCodeAt(0);
      out += code >= 0x20 && code <= 0x7e ? char : '?';
    }
  }
  return out;
}

const encode = (text: string): number[] => Array.from(printable(text), (c) => c.charCodeAt(0));

/** A slip being built: each call adds commands; `bytes()` is what goes to the printer. */
export class EscPos {
  private readonly out: number[] = [];

  /** ESC @: back to the printer's defaults. */
  init(): this {
    return this.push(ESC, 0x40);
  }

  /** ESC a n */
  align(a: Align): this {
    return this.push(ESC, 0x61, ALIGN[a]);
  }

  /** ESC E n */
  bold(on: boolean): this {
    return this.push(ESC, 0x45, on ? 1 : 0);
  }

  /** GS ! n: width and height multipliers. */
  size(w: Scale, h: Scale): this {
    return this.push(GS, 0x21, ((w - 1) << 4) | (h - 1));
  }

  text(s: string): this {
    return this.push(...encode(s));
  }

  /** The text, then a line feed. */
  line(s = ''): this {
    return this.text(s).push(LF);
  }

  /** ESC d n: print and feed n lines. */
  feed(n: number): this {
    return this.push(ESC, 0x64, clampByte(n));
  }

  /** A full-width line of one character. */
  rule(char = '-'): this {
    return this.line((printable(char)[0] ?? '-').repeat(COLUMNS));
  }

  /** A QR code drawn by the printer: model 2, error correction M. */
  qr(data: string, moduleSize = 6): this {
    const bytes = encode(data);
    const length = bytes.length + 3;
    return this.push(...QR, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00)
      .push(...QR, 0x03, 0x00, 0x31, 0x43, Math.min(16, Math.max(1, Math.round(moduleSize))))
      .push(...QR, 0x03, 0x00, 0x31, 0x45, 0x31)
      .push(...QR, length & 0xff, (length >> 8) & 0xff, 0x31, 0x50, 0x30, ...bytes)
      .push(...QR, 0x03, 0x00, 0x31, 0x51, 0x30);
  }

  /** GS V 66 0: feed to the cutter, then a partial cut. */
  cut(): this {
    return this.push(GS, 0x56, 0x42, 0x00);
  }

  bytes(): Uint8Array {
    return Uint8Array.from(this.out);
  }

  private push(...bytes: number[]): this {
    for (const b of bytes) this.out.push(b);
    return this;
  }
}

const clampByte = (n: number): number => Math.min(255, Math.max(0, Math.round(n)));

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Standard base64 (the native module takes the slip as a string). */
export function toBase64(bytes: Uint8Array): string {
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = i + 1 < bytes.length ? bytes[i + 1] : 0;
    const c = i + 2 < bytes.length ? bytes[i + 2] : 0;
    const n = (a << 16) | (b << 8) | c;
    out += BASE64[(n >> 18) & 63] + BASE64[(n >> 12) & 63];
    out += i + 1 < bytes.length ? BASE64[(n >> 6) & 63] : '=';
    out += i + 2 < bytes.length ? BASE64[n & 63] : '=';
  }
  return out;
}
