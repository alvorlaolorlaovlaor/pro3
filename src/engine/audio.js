/**
 * Tone.js wrapper. iOS Safari refuses to play audio until a user
 * gesture, so `unlock()` must be called from a click/touch handler.
 */
let unlocked = false;
let muted = false;
const Tone = window.Tone;

const pluck = new Tone.PluckSynth({
  attackNoise: 0.6,
  dampening: 4000,
  resonance: 0.85,
}).toDestination();
pluck.volume.value = -10;

const marimba = new Tone.PolySynth(Tone.Synth, {
  oscillator: { type: "triangle" },
  envelope: { attack: 0.005, decay: 0.4, sustain: 0.1, release: 0.8 },
}).toDestination();
marimba.volume.value = -14;

const whoosh = new Tone.NoiseSynth({
  noise: { type: "pink" },
  envelope: { attack: 0.005, decay: 0.18, sustain: 0 },
}).toDestination();
whoosh.volume.value = -16;

const bell = new Tone.MetalSynth({
  frequency: 220,
  envelope: { attack: 0.001, decay: 1.2, release: 0.4 },
  harmonicity: 4.1,
  modulationIndex: 16,
  resonance: 2000,
  octaves: 0.6,
}).toDestination();
bell.volume.value = -20;

const masterFilter = new Tone.Filter(8000, "lowpass").toDestination();

export async function unlock() {
  if (unlocked) return;
  try {
    await Tone.start();
    unlocked = true;
  } catch (e) {
    // No-op; the next gesture will retry.
  }
}

export function setMuted(value) {
  muted = value;
  Tone.Destination.mute = value;
}

export function isMuted() {
  return muted;
}

const PENTATONIC = ["C4", "D4", "E4", "G4", "A4", "C5", "D5", "E5", "G5", "A5"];

let lastCollisionAt = 0;
export function playCollision(intensity = 0.5) {
  if (!unlocked || muted) return;
  const now = performance.now();
  if (now - lastCollisionAt < 35) return; // rate-limit so big stacks don't roar
  lastCollisionAt = now;
  const note = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
  pluck.triggerAttack(note, undefined, Math.min(0.9, 0.2 + intensity));
}

export function playMarimba(note, velocity = 0.6) {
  if (!unlocked || muted) return;
  marimba.triggerAttackRelease(note, "8n", undefined, velocity);
}

export function playWhoosh() {
  if (!unlocked || muted) return;
  whoosh.triggerAttackRelease("8n");
}

export function playBell() {
  if (!unlocked || muted) return;
  bell.triggerAttackRelease("C5", "4n");
}

export function playArpeggio() {
  if (!unlocked || muted) return;
  const notes = ["C4", "E4", "G4", "B4", "D5"];
  const now = Tone.now();
  notes.forEach((n, i) => marimba.triggerAttackRelease(n, "8n", now + i * 0.09, 0.7));
}
