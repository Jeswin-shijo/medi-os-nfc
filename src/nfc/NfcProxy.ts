import { Platform } from 'react-native';
import NfcManager, { NfcAdapter, NfcEvents, type TagEvent } from 'react-native-nfc-manager';
import { strings } from '../i18n/strings';

type TagListener = (tag: TagEvent) => void;

/**
 * Android reader mode: the kiosk takes every card itself (no system "new tag" screen, no other
 * app), skips the NDEF check (only the chip id matters) and stays quiet: the kiosk plays its
 * own chime once the patient is found.
 */
const READER_FLAGS =
  NfcAdapter.FLAG_READER_NFC_A |
  NfcAdapter.FLAG_READER_NFC_B |
  NfcAdapter.FLAG_READER_NFC_F |
  NfcAdapter.FLAG_READER_NFC_V |
  NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK |
  NfcAdapter.FLAG_READER_NO_PLATFORM_SOUNDS;

/**
 * The tablet's built-in NFC reader, read-only. Screens that take cards subscribe with `onTag`.
 * From the first subscription on, the kiosk keeps the reader for itself while it is in front, even
 * when no screen is listening: a card tapped on a later step is ignored instead of opening Android's
 * own "new tag" handling. Where the tablet has no NFC (the emulator) or it is switched off, nothing
 * happens and nothing is shown: the USB reader still works. Never throws.
 */
class NfcProxy {
  private started: Promise<boolean> | null = null;
  private readonly listeners = new Set<TagListener>();
  private registered = false;
  /** Registrations run one after another, never interleaved. */
  private queue: Promise<void> = Promise.resolve();

  /** Starts the NFC manager once. Resolves false when the tablet has no usable NFC. */
  start(): Promise<boolean> {
    this.started ??= this.boot();
    return this.started;
  }

  /** Calls `listener` with every tag read until the returned function is called. */
  onTag(listener: TagListener): () => void {
    this.listeners.add(listener);
    this.listen();
    return () => {
      this.listeners.delete(listener);
    };
  }

  private async boot(): Promise<boolean> {
    try {
      if (!(await NfcManager.isSupported())) return false;
      await NfcManager.start();
    } catch {
      return false;
    }
    NfcManager.setEventListener(NfcEvents.DiscoverTag, (tag: TagEvent) => {
      for (const listener of [...this.listeners]) listener(tag);
    });
    // iOS ends a reading session after a while (Android never does): listen again while a screen wants cards.
    NfcManager.setEventListener(NfcEvents.SessionClosed, () => {
      this.registered = false;
      if (this.listeners.size > 0) this.listen();
    });
    // Switched off in the system settings: the registration is gone. Switched on: listen afresh.
    NfcManager.setEventListener(NfcEvents.StateChanged, (event: { state: string }) => {
      if (event.state === 'off' || event.state === 'on') this.registered = false;
      if (event.state === 'on') this.listen();
    });
    return true;
  }

  private listen(): void {
    this.queue = this.queue.then(() => this.register()).catch(() => undefined);
  }

  private async register(): Promise<void> {
    if (this.registered || !(await this.start()) || !(await this.isOn())) return;
    try {
      await NfcManager.registerTagEvent({
        invalidateAfterFirstRead: false,
        isReaderModeEnabled: Platform.OS === 'android',
        readerModeFlags: READER_FLAGS,
        alertMessage: strings.card.nfcPrompt,
      });
      this.registered = true;
    } catch {
      // Busy or off: tried again on the next subscription or when NFC is switched on.
    }
  }

  private async isOn(): Promise<boolean> {
    try {
      return await NfcManager.isEnabled();
    } catch {
      return false;
    }
  }
}

export default new NfcProxy();
