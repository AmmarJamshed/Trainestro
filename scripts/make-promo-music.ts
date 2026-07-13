/**
 * Generate a short upbeat royalty-free melody bed (no external samples).
 */
import { writeFileSync, mkdirSync } from "fs";
import path from "path";

const sampleRate = 44100;
const bpm = 108;
const beat = 60 / bpm;
const durationSec = 32;

function noteFreq(semiFromA4: number) {
  return 440 * Math.pow(2, semiFromA4 / 12);
}

// C major pentatonic-ish hook (MIDI-ish semis from A4)
const melody = [
  3, 5, 7, 10, 7, 5, 3, 5, 7, 12, 10, 7, 5, 3, 0, 3,
  5, 7, 10, 12, 10, 7, 5, 7, 3, 5, 7, 10, 7, 5, 3, 0,
];
const bass = [3 - 24, 3 - 24, 0 - 24, 0 - 24, 5 - 24, 5 - 24, 7 - 24, 7 - 24];

const totalSamples = Math.floor(sampleRate * durationSec);
const left = new Float32Array(totalSamples);
const right = new Float32Array(totalSamples);

function env(t: number, noteLen: number) {
  const a = 0.02;
  const r = 0.08;
  if (t < a) return t / a;
  if (t > noteLen - r) return Math.max(0, (noteLen - t) / r);
  return 1;
}

const step = beat / 2; // eighth notes
for (let i = 0; i < Math.floor(durationSec / step); i++) {
  const start = Math.floor(i * step * sampleRate);
  const len = Math.floor(step * sampleRate * 0.92);
  const mSemi = melody[i % melody.length];
  const bSemi = bass[Math.floor(i / 2) % bass.length];
  const mf = noteFreq(mSemi);
  const bf = noteFreq(bSemi);
  for (let s = 0; s < len && start + s < totalSamples; s++) {
    const t = s / sampleRate;
    const e = env(t, len / sampleRate);
    const lead =
      0.18 * Math.sin(2 * Math.PI * mf * t) +
      0.06 * Math.sin(2 * Math.PI * mf * 2 * t);
    const bassTone = 0.14 * Math.sin(2 * Math.PI * bf * t);
    const kick =
      i % 4 === 0 && t < 0.12
        ? 0.22 * Math.sin(2 * Math.PI * (120 - t * 400) * t) * (1 - t / 0.12)
        : 0;
    const hat =
      i % 2 === 1 && t < 0.04 ? 0.04 * (Math.random() * 2 - 1) * (1 - t / 0.04) : 0;
    const sample = (lead + bassTone + kick + hat) * e;
    const pan = 0.15 * Math.sin(i);
    left[start + s] += sample * (0.85 - pan);
    right[start + s] += sample * (0.85 + pan);
  }
}

function clamp(v: number) {
  return Math.max(-1, Math.min(1, v));
}

const dataSize = totalSamples * 2 * 2;
const buffer = Buffer.alloc(44 + dataSize);
buffer.write("RIFF", 0);
buffer.writeUInt32LE(36 + dataSize, 4);
buffer.write("WAVE", 8);
buffer.write("fmt ", 12);
buffer.writeUInt32LE(16, 16);
buffer.writeUInt16LE(1, 20);
buffer.writeUInt16LE(2, 22);
buffer.writeUInt32LE(sampleRate, 24);
buffer.writeUInt32LE(sampleRate * 2 * 2, 28);
buffer.writeUInt16LE(4, 32);
buffer.writeUInt16LE(16, 34);
buffer.write("data", 36);
buffer.writeUInt32LE(dataSize, 40);

let o = 44;
for (let i = 0; i < totalSamples; i++) {
  buffer.writeInt16LE((clamp(left[i]) * 32767) | 0, o);
  o += 2;
  buffer.writeInt16LE((clamp(right[i]) * 32767) | 0, o);
  o += 2;
}

const outDir = path.join(process.cwd(), "public", "promo");
mkdirSync(outDir, { recursive: true });
const out = path.join(outDir, "bg-music.wav");
writeFileSync(out, buffer);
console.log("Wrote", out, `(${durationSec}s)`);
