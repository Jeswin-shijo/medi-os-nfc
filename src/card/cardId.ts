// No react-native imports: tested in plain Node.

/** A burst ends when nothing arrives for this long (readers that send no Enter). */
const SILENCE_MS = 120;
/** Card readers type a whole id in a few ms; a gap longer than this between keys is a person typing. */
const MAX_KEY_GAP_MS = 80;
/** What a reader types: 4 or more hex digits (decimal ids are hex digits too). Anything else is not a card. */
const READER_ID = /^[0-9A-Fa-f]{4,}$/;

const SEPARATORS = /[\s:-]/g;
const HEX = /^[0-9A-F]+$/;

/**
 * The card id the backend looks up, from what the built-in NFC chip reports: hex, upper case,
 * no separators ('04:a1:b2:c3' and [4, 161, 178, 195] → '04A1B2C3'). Null when there is no usable id.
 * The backend also finds cards linked by a desk reader in decimal or the other byte order.
 */
export function tagIdToCardId(id: string | number[] | undefined): string | null {
  if (id === undefined) return null;
  const hex = Array.isArray(id)
    ? id.map((byte) => (byte & 0xff).toString(16).padStart(2, '0')).join('')
    : id.replace(SEPARATORS, '');
  const upper = hex.toUpperCase();
  return upper && HEX.test(upper) ? upper : null;
}

/**
 * Turns the keys a USB card reader "types" into card ids. The reader acts as a keyboard: it types
 * the id in one fast burst, usually followed by Enter. `push` takes the newly typed text (one key
 * or several) with the time it arrived and returns the id when a burst completes: at Enter or a
 * newline, or, for readers that send no Enter, on the first push (an empty one is a plain time
 * check) after 120 ms of silence. Bursts with a gap of more than 80 ms between keys look typed by
 * hand and are dropped, as is anything but 4 or more hex digits.
 */
export class UsbReaderBuffer {
  private chars = '';
  private lastKeyAt = 0;
  /** The current burst had a slow key in it. */
  private byHand = false;

  push(text: string, nowMs: number): string | null {
    let completed: string | null = null;
    const keep = (id: string | null) => {
      completed ??= id;
    };

    if (this.chars && nowMs - this.lastKeyAt > SILENCE_MS) keep(this.finish());

    for (const ch of text) {
      if (ch === '\n' || ch === '\r') {
        keep(this.finish());
        continue;
      }
      if (this.chars && nowMs - this.lastKeyAt > MAX_KEY_GAP_MS) this.byHand = true;
      this.chars += ch;
      this.lastKeyAt = nowMs;
    }
    return completed;
  }

  /** Ends the current burst: its id, or null when it was typed by hand or is not a reader id. */
  private finish(): string | null {
    const id = this.chars.trim();
    const valid = !this.byHand && READER_ID.test(id);
    this.chars = '';
    this.byHand = false;
    return valid ? id.toUpperCase() : null;
  }
}

/**
 * Lets each card through once: the same id again within `windowMs` of the last time it was seen
 * is ignored (a card held on the reader, or read by NFC and USB at once). Another card passes at once.
 */
export class RepeatGuard {
  private lastId: string | null = null;
  private lastSeenAt = 0;

  constructor(private readonly windowMs: number) {}

  accept(id: string, nowMs: number): boolean {
    const repeat = id === this.lastId && nowMs - this.lastSeenAt < this.windowMs;
    this.lastId = id;
    this.lastSeenAt = nowMs;
    return !repeat;
  }
}
