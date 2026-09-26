/**
 * Small synthesised sound effects via the Web Audio API — no audio files needed.
 * Everything is a no-op until `unlock()` has run inside a user gesture.
 */

let ctx: AudioContext | null = null;
let enabled = true;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
}

/** Create/resume the audio context. Must be called from a user gesture. */
export function unlock(): void {
  const c = getContext();
  if (c && c.state === "suspended") void c.resume();
}

export function setSoundEnabled(value: boolean): void {
  enabled = value;
}

interface ToneOptions {
  freq: number;
  to?: number;
  duration: number;
  type?: OscillatorType;
  gain?: number;
  delay?: number;
}

function tone({ freq, to, duration, type = "sine", gain = 0.12, delay = 0 }: ToneOptions): void {
  const c = getContext();
  if (!c || !enabled || c.state !== "running") return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const amp = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + duration);
  amp.gain.setValueAtTime(0.0001, t0);
  amp.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(amp).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

function noise(duration: number, gain = 0.04): void {
  const c = getContext();
  if (!c || !enabled || c.state !== "running") return;
  const buffer = c.createBuffer(1, Math.floor(c.sampleRate * duration), c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 1200;
  const amp = c.createGain();
  amp.gain.value = gain;
  src.connect(filter).connect(amp).connect(c.destination);
  src.start();
}

export const sounds = {
  slide(): void {
    noise(0.065, 0.025);
  },
  /** Pitch rises with the value, and climbs further as a combo builds. */
  merge(value: number, combo = 1): void {
    const step = Math.min(12, Math.log2(Math.max(2, value))) + Math.min(8, Math.max(0, combo - 1));
    const base = 220 * Math.pow(2, step / 12);
    tone({ freq: 100, to: 45, duration: 0.1, type: "sine", gain: 0.12 });
    noise(0.045, 0.035);
    tone({ freq: base * 2, to: base, duration: 0.18, type: "triangle", gain: 0.065 });
    if (combo >= 3) tone({ freq: base * 2, duration: 0.08, type: "sine", gain: 0.04, delay: 0.05 });
  },
  unlock(): void {
    tone({ freq: 523, duration: 0.12, type: "sine" });
    tone({ freq: 784, duration: 0.18, type: "sine", delay: 0.1 });
  },
  achievement(): void {
    tone({ freq: 659, duration: 0.1, type: "square", gain: 0.05 });
    tone({ freq: 784, duration: 0.1, type: "square", gain: 0.05, delay: 0.09 });
    tone({ freq: 1047, duration: 0.25, type: "square", gain: 0.05, delay: 0.18 });
  },
  win(): void {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone({ freq: f, duration: 0.3, type: "triangle", gain: 0.1, delay: i * 0.12 }),
    );
  },
  over(): void {
    tone({ freq: 330, to: 165, duration: 0.5, type: "sawtooth", gain: 0.06 });
  },
  tick(): void {
    tone({ freq: 880, duration: 0.04, type: "square", gain: 0.03 });
  },
};

export function vibrate(pattern: number | number[]): void {
  if (typeof navigator === "undefined" || !("vibrate" in navigator)) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* unsupported */
  }
}
