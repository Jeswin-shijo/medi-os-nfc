import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import { create } from 'zustand';
import { loadSoundsOn, saveSoundsOn } from '../config/kioskConfigStore';

// Touch, success and error feedback: a haptic always, a soft chime when sounds are on.
// Every call is fire-and-forget: feedback never throws and never delays the action it confirms.

const SOURCES = {
  tap: require('../../assets/sounds/tap.wav') as number,
  success: require('../../assets/sounds/success.wav') as number,
};
const VOLUME = { tap: 0.35, success: 0.8 };

type Sound = keyof typeof SOURCES;

interface FeedbackSettings {
  /** Staff switch the chimes off in the staff menu. Persisted; on by default. */
  soundsOn: boolean;
  load: () => Promise<void>;
  setSoundsOn: (on: boolean) => Promise<void>;
}

export const useFeedbackSettings = create<FeedbackSettings>((set) => ({
  soundsOn: true,
  async load() {
    set({ soundsOn: await loadSoundsOn().catch(() => true) });
  },
  async setSoundsOn(on) {
    set({ soundsOn: on });
    await saveSoundsOn(on).catch(() => undefined);
  },
}));

const players: Partial<Record<Sound, AudioPlayer>> = {};

function player(sound: Sound): AudioPlayer | null {
  try {
    if (!players[sound]) {
      const created = createAudioPlayer(SOURCES[sound]);
      created.volume = VOLUME[sound];
      players[sound] = created;
    }
    return players[sound] ?? null;
  } catch {
    return null;
  }
}

function play(sound: Sound): void {
  if (!useFeedbackSettings.getState().soundsOn) return;
  const p = player(sound);
  if (!p) return;
  try {
    // Rewind, then play: a chime pressed twice in a row restarts instead of being skipped.
    void p.seekTo(0).catch(() => undefined);
    p.play();
  } catch {
    // A missing audio device must not break a touch.
  }
}

const quiet = (call: () => Promise<void>): void => {
  try {
    void call().catch(() => undefined);
  } catch {
    // Haptics unavailable (emulator without a vibrator).
  }
};

export const feedback = {
  /** Load the saved sound setting and the two chimes, so the first touch is not late. */
  async prepare(): Promise<void> {
    await useFeedbackSettings.getState().load();
    await setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' }).catch(() => undefined);
    player('tap');
    player('success');
  },

  /** A light tick for every press. */
  tap(): void {
    quiet(() =>
      Platform.OS === 'android'
        ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
        : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light),
    );
    play('tap');
  },

  /** Card read, code accepted, payment received. */
  success(): void {
    quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    play('success');
  },

  /** Unknown card, wrong code. No sound: an error should not announce itself to the room. */
  error(): void {
    quiet(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
  },
};
