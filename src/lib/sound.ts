/** The dojo's procedural sound palette: wood, wind, steel, and pentatonic chimes. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let echo: GainNode | null = null;
let enabled = true;
let volume = 0.65;
const voices = new Set<AudioScheduledSourceNode>();
const PENTATONIC = [293.66, 329.63, 392, 440, 493.88];

function outputLevel() { return enabled ? volume * volume * 0.75 : 0; }
function updateLevel() {
  if (!ctx || !master) return;
  master.gain.cancelScheduledValues(ctx.currentTime);
  master.gain.setTargetAtTime(outputLevel(), ctx.currentTime, 0.018);
}

/** Called from a gesture; unsupported or blocked audio never interrupts a move. */
export async function unlock(): Promise<void> {
  if (!enabled || volume === 0 || typeof window === "undefined") return;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = outputLevel();
      // Keep simultaneous merges and celebrations from producing harsh peaks.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -12;
      limiter.knee.value = 15;
      limiter.ratio.value = 8;
      limiter.attack.value = 0.003;
      limiter.release.value = 0.15;
      master.connect(limiter).connect(ctx.destination);
      const delay = ctx.createDelay(1);
      delay.delayTime.value = 0.115;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.19;
      const lowpass = ctx.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 2400;
      echo = ctx.createGain();
      echo.gain.value = 0.16;
      echo.connect(delay).connect(lowpass).connect(master);
      lowpass.connect(feedback).connect(delay);
    }
    if (ctx.state === "suspended") await ctx.resume();
  } catch { /* Audio is optional, including on browsers that block it. */ }
}
export function setSoundEnabled(value: boolean): void {
  enabled = value;
  updateLevel();
}
export function setSoundVolume(value: number): void {
  volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.65;
  updateLevel();
}
function ready(): boolean { return !!ctx && !!master && enabled && volume > 0 && ctx.state === "running" && voices.size < 64; }
function track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
  voices.add(source);
  source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach((n) => n.disconnect()); };
}
interface Tone { freq: number; to?: number; duration: number; type?: OscillatorType; gain?: number; delay?: number; ring?: boolean }
function tone({freq,to,duration,type="sine",gain=0.1,delay=0,ring=false}: Tone): void {
  if (!ready()) return;
  const c=ctx!, t=c.currentTime+delay;
  const osc=c.createOscillator(), amp=c.createGain();
  osc.type=type;osc.frequency.setValueAtTime(freq,t);
  if(to)osc.frequency.exponentialRampToValueAtTime(to,t+duration);
  amp.gain.setValueAtTime(0.0001,t);
  amp.gain.exponentialRampToValueAtTime(gain,t+0.006);
  amp.gain.exponentialRampToValueAtTime(0.0001,t+duration);
  osc.connect(amp).connect(master!);
  if(ring && echo)amp.connect(echo);
  track(osc,[amp]);osc.start(t);osc.stop(t+duration+0.02);
}
function air(duration=0.09,gain=0.045,from=1900,to=650,delay=0): void {
  if(!ready())return;
  const c=ctx!, t=c.currentTime+delay;
  const buffer=c.createBuffer(1,Math.ceil(c.sampleRate*duration),c.sampleRate);
  const data=buffer.getChannelData(0);
  for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
  const src=c.createBufferSource(),filter=c.createBiquadFilter(),amp=c.createGain();
  src.buffer=buffer;filter.type="bandpass";filter.Q.value=0.7;
  filter.frequency.setValueAtTime(from,t);filter.frequency.exponentialRampToValueAtTime(to,t+duration);
  amp.gain.setValueAtTime(0.0001,t);amp.gain.exponentialRampToValueAtTime(gain,t+0.015);amp.gain.exponentialRampToValueAtTime(0.0001,t+duration);
  src.connect(filter).connect(amp).connect(master!);track(src,[filter,amp]);src.start(t);
}
function pluck(freq: number,delay=0,gain=0.12) {
  tone({freq,to:freq*0.997,duration:0.42,type:"triangle",gain,delay,ring:true});
  tone({freq:freq*2.01,duration:0.16,gain:gain*0.26,delay});
  tone({freq:freq*3.98,duration:0.055,gain:gain*0.08,delay});
}
function bell(freq: number,delay=0,gain=0.09) {
  tone({freq,duration:0.85,gain,delay,ring:true});
  tone({freq:freq*2.76,duration:0.4,gain:gain*0.16,delay});
}
function mergeStrike(value: number,combo=1,delay=0) {
  const rank=Math.max(0,Math.min(12,Math.log2(Math.max(2,value))-1));
  const note=PENTATONIC[rank%5]*2**Math.floor(rank/5);
  air(0.07,0.045,2800,950,delay);
  tone({freq:125,to:48,duration:0.14,gain:0.2,delay});
  pluck(note,delay+0.025,0.11);
  if(combo>=3)pluck(PENTATONIC[Math.min(4,combo-3)]*2,delay+0.08,0.07);
}
export const sounds = {
  select(): void { pluck(587.33,0,0.055); },
  slide(): void { air(0.1,0.032,1350,450); },
  merge(value: number,combo=1): void { mergeStrike(value,combo); },
  smoke(): void { air(0.28,0.07,800,260);bell(1174.66,0.07,0.035); },
  undo(): void { tone({freq:620,to:293.66,duration:0.18,type:"triangle",gain:0.07});air(0.13,0.02,450,1500); },
  unlock(): void { pluck(587.33,0.08,0.1);bell(880,0.2,0.08); },
  achievement(): void { [587.33,783.99,987.77].forEach((freq,i)=>pluck(freq,0.1+i*0.095,0.09));bell(1174.66,0.4,0.065); },
  win(): void { [293.66,392,440,587.33].forEach((freq,i)=>pluck(freq,i*0.13,0.13));bell(1174.66,0.52,0.09); },
  missionComplete(chapter=false): void {
    [392,440,587.33,783.99].forEach((freq,i)=>pluck(freq,0.12+i*0.13,0.13));
    bell(chapter?1174.66:880,0.65,0.1);
    if(chapter){tone({freq:146.83,duration:1.5,gain:0.12,delay:0.6,ring:true});bell(1567.98,0.82,0.06);}
  },
  over(): void { pluck(392,0,0.08);pluck(329.63,0.15,0.065);bell(293.66,0.32,0.075); },
  tick(): void { tone({freq:880,duration:0.035,type:"triangle",gain:0.045}); },
  preview(): void { air();mergeStrike(64,3,0.2);bell(880,0.7,0.1); },
};

export function vibrate(pattern: number | number[]): void {
  if(typeof navigator==="undefined" || !("vibrate" in navigator))return;
  try { navigator.vibrate(pattern); } catch { /* Unsupported hardware. */ }
}
