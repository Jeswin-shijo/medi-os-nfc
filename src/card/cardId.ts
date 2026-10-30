// No react-native imports: tested in plain Node.

/** A burst ends when nothing arrives for this long (readers that send no Enter). */
const SILENCE_MS = 120;
/** Keys left this long without their Enter are dropped, so they never join the next card's id. */
const LEFT_OVER_MS = 1000;
/** Card readers type a whole id in a few ms; a burst with a longer gap between keys is never ended by silence alone. */
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

/** What the kiosk has learnt about its USB reader, shared by the buffers of every screen that listens for cards. */
export interface ReaderHabits {
  /** The reader ended an id with Enter: from then on only Enter ends a burst, never a pause. */
  sendsEnter: boolean;
}

/**
 * Turns the keys a USB card reader "types" into card ids. The reader acts as a keyboard: it types
 * the id in one fast burst, usually followed by Enter. `push` takes the newly typed text (one key
 * or several) with the time it arrived and returns the id when a burst completes:
 * - at Enter or a newline: any 4 or more hex digits, however far apart the keys reached the app
 *   (a busy JS thread delivers a real reader's keys 100–200 ms apart);
 * - for readers that send no Enter, on the first push (an empty one is a plain time check) after
 *   120 ms of silence, when it is a reader id and no key came more than 80 ms after the one before.
 *   Anything else may be a reader's keys running late (the first of them, or a slow one): it waits
 *   for more keys and its Enter.
 * Once the reader has ended an id with Enter, silence ends nothing: a stall in the middle of an id
 * cannot split it in two. `habits` carries that across the buffers of different screens. Keys left
 * for over a second without completing are dropped.
 */
export class UsbReaderBuffer {
  private chars = '';
  private lastKeyAt = 0;
  /** The current burst had a slow key in it. */
  private byHand = false;

  constructor(private readonly habits: ReaderHabits = { sendsEnter: false }) {}

  push(text: string, nowMs: number): string | null {
    let completed: string | null = null;

    if (this.chars) {
      const quiet = nowMs - this.lastKeyAt;
      if (quiet > SILENCE_MS && !this.habits.sendsEnter && !this.byHand && READER_ID.test(this.chars.trim())) completed = this.finish();
      else if (quiet > LEFT_OVER_MS) this.clear();
    }

    for (const ch of text) {
      if (ch === '\n' || ch === '\r') {
        const id = this.finish();
        if (id) this.habits.sendsEnter = true;
        completed ??= id;
        continue;
      }
      if (this.chars && nowMs - this.lastKeyAt > MAX_KEY_GAP_MS) this.byHand = true;
      this.chars += ch;
      this.lastKeyAt = nowMs;
    }
    return completed;
  }

  /** Ends the current burst: its id, or null when it is not a reader id. */
  private finish(): string | null {
    const id = this.chars.trim();
    this.clear();
    return READER_ID.test(id) ? id.toUpperCase() : null;
  }

  private clear(): void {
    this.chars = '';
    this.byHand = false;
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
