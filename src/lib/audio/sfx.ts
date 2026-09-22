/** Lightweight synthesized SFX — no external audio files. */

type Tone = { freq: number; dur: number; type?: OscillatorType; gain?: number };

let ctx: AudioContext | null = null;
let muted = false;
let master = 0.28;

function ac(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new C();
  }
  return ctx;
}

export function setAudioMuted(v: boolean) {
  muted = v;
}

export function setAudioVolume(v: number) {
  master = Math.max(0, Math.min(1, v));
}

export function getAudioMuted() {
  return muted;
}

function playTones(tones: Tone[]) {
  if (muted || master <= 0) return;
  const audio = ac();
  if (!audio) return;
  void audio.resume();
  const t0 = audio.currentTime;
  for (const tone of tones) {
    const osc = audio.createOscillator();
    const g = audio.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.value = tone.freq;
    const vol = (tone.gain ?? 0.08) * master;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + tone.dur);
    osc.connect(g);
    g.connect(audio.destination);
    osc.start(t0);
    osc.stop(t0 + tone.dur + 0.02);
  }
}

export const sfx = {
  click: () => playTones([{ freq: 620, dur: 0.05, type: "triangle", gain: 0.04 }]),
  build: () =>
    playTones([
      { freq: 180, dur: 0.12, type: "square", gain: 0.05 },
      { freq: 320, dur: 0.18, type: "triangle", gain: 0.06 },
      { freq: 520, dur: 0.22, type: "sine", gain: 0.05 },
    ]),
  upgradeStart: () =>
    playTones([
      { freq: 280, dur: 0.1, type: "triangle", gain: 0.05 },
      { freq: 420, dur: 0.14, type: "sine", gain: 0.05 },
    ]),
  upgradeDone: () =>
    playTones([
      { freq: 440, dur: 0.12, type: "sine", gain: 0.06 },
      { freq: 660, dur: 0.16, type: "sine", gain: 0.05 },
    ]),
  max: () =>
    playTones([
      { freq: 523, dur: 0.15, type: "sine", gain: 0.07 },
      { freq: 659, dur: 0.18, type: "sine", gain: 0.07 },
      { freq: 784, dur: 0.28, type: "sine", gain: 0.08 },
    ]),
  money: () => playTones([{ freq: 880, dur: 0.08, type: "triangle", gain: 0.04 }]),
  reward: () =>
    playTones([
      { freq: 523, dur: 0.1, type: "sine", gain: 0.05 },
      { freq: 784, dur: 0.18, type: "sine", gain: 0.06 },
    ]),
  alert: () =>
    playTones([
      { freq: 340, dur: 0.1, type: "sawtooth", gain: 0.035 },
      { freq: 280, dur: 0.14, type: "sawtooth", gain: 0.03 },
    ]),
  arrive: () => playTones([{ freq: 490, dur: 0.12, type: "sine", gain: 0.045 }]),
};
