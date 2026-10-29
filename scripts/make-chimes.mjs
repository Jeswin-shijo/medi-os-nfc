// Generates the kiosk's two feedback sounds as small mono WAV files, with no dependencies:
//   assets/sounds/tap.wav      a soft 60 ms tick for touches
//   assets/sounds/success.wav  a gentle two-note rising chime (card read, payment done)
// Run: node scripts/make-chimes.mjs   (the output is committed; rerun only to change the sounds)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 44_100;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');

/**
 * One bell-like note: a sine with a quiet octave on top, a short attack (no click) and an
 * exponential decay. Returns samples in -1..1.
 */
function note({ freq, start, decay, gain, length, attack = 0.004 }) {
  const samples = new Float64Array(Math.round(length * RATE));
  for (let i = 0; i < samples.length; i++) {
    const t = i / RATE - start;
    if (t < 0) continue;
    const envelope = Math.min(1, t / attack) * Math.exp(-t / decay);
    const tone = Math.sin(2 * Math.PI * freq * t) + 0.12 * Math.sin(2 * Math.PI * 2 * freq * t);
    samples[i] = (gain * envelope * tone) / 1.12;
  }
  return samples;
}

function mix(length, ...parts) {
  const out = new Float64Array(Math.round(length * RATE));
  for (const part of parts) for (let i = 0; i < out.length; i++) out[i] += part[i] ?? 0;
  // Fade the last 10 ms to silence so the file never ends on a click.
  const fade = Math.round(0.01 * RATE);
  for (let i = 0; i < fade; i++) out[out.length - 1 - i] *= i / fade;
  return out;
}

/** 16-bit PCM mono WAV. */
function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32_767), i * 2));
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

const tapLength = 0.06;
const tap = mix(tapLength, note({ freq: 1_175, start: 0, decay: 0.014, gain: 0.32, length: tapLength, attack: 0.002 }));

// A5 then E6, a rising fifth: friendly, short, not a fanfare.
const successLength = 0.7;
const success = mix(
  successLength,
  note({ freq: 880, start: 0, decay: 0.16, gain: 0.42, length: successLength }),
  note({ freq: 1_318.5, start: 0.12, decay: 0.2, gain: 0.38, length: successLength }),
);

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'tap.wav'), wav(tap));
writeFileSync(join(OUT, 'success.wav'), wav(success));
console.log(`Wrote tap.wav (${tapLength * 1000} ms) and success.wav (${successLength * 1000} ms) to ${OUT}`);
