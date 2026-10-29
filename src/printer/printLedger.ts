// How many times each slip has been printed, and how the last print went. No react-native imports: tested in plain Node.

export type PrintJobState = 'idle' | 'printing' | 'printed' | 'failed';

export interface SlipRecord {
  used: number;
  state: PrintJobState;
}

const NEVER_PRINTED: SlipRecord = Object.freeze({ used: 0, state: 'idle' });

/**
 * Prints per slip (a visit, or a token), kept outside any screen: a screen that mounts again (or
 * React running an effect twice) never prints the automatic slip a second time, never resets the
 * limit, and still shows how the last print went. A store for `useSyncExternalStore`: `get`
 * returns the same object until that slip changes. Remembers only the most recent slips: one
 * kiosk serves one patient at a time.
 */
export class PrintLedger {
  private readonly records = new Map<string, SlipRecord>();
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly maxPrints: number,
    private readonly remember = 50,
  ) {}

  get = (key: string): SlipRecord => this.records.get(key) ?? NEVER_PRINTED;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  /** The automatic print: true only if this slip has never been printed. */
  claimFirst(key: string): boolean {
    return this.get(key).used === 0 && this.claim(key);
  }

  /**
   * One more print, if none is running and the limit allows. Counted at once (before printing),
   * so two quick presses, or an effect run twice, cannot both pass.
   */
  claim(key: string): boolean {
    const { used, state } = this.get(key);
    if (state === 'printing' || used >= this.maxPrints) return false;
    this.set(key, { used: used + 1, state: 'printing' });
    return true;
  }

  /** The print that `claim` started has ended. */
  finish(key: string, ok: boolean): void {
    const record = this.records.get(key);
    if (record?.state !== 'printing') return;
    this.set(key, { used: record.used, state: ok ? 'printed' : 'failed' });
  }

  private set(key: string, record: SlipRecord): void {
    // Re-inserted, so the Map's order is "least recently changed first".
    this.records.delete(key);
    this.records.set(key, record);
    while (this.records.size > this.remember) {
      const oldest = this.records.keys().next().value;
      if (oldest === undefined) break;
      this.records.delete(oldest);
    }
    this.listeners.forEach((listener) => listener());
  }
}
