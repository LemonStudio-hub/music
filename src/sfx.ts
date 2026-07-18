/**
 * Hit sound effects - synthesized per lane
 * Lane 0 (bass):    80Hz sine wave (kick)
 * Lane 1 (mid):     400Hz square wave (snare)
 * Lane 2/3 (high):  1200Hz noise burst (hi-hat)
 */

let audioCtx: AudioContext | null = null;

export function getCtx(): AudioContext {
  if (!audioCtx) {
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = win.AudioContext ?? win.webkitAudioContext;
    if (!Ctor) throw new Error('AudioContext not supported');
    audioCtx = new Ctor();
  }
  return audioCtx;
}

function playKick(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = 'sine';
  osc.frequency.setValueAtTime(80, t);
  osc.frequency.exponentialRampToValueAtTime(40, t + 0.08);

  gain.gain.setValueAtTime(0.6, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.15);
}

function playSnare(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Square wave body
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();

  osc.type = 'square';
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.exponentialRampToValueAtTime(200, t + 0.05);

  oscGain.gain.setValueAtTime(0.3, t);
  oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

  osc.connect(oscGain);
  oscGain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + 0.1);

  // Noise layer for texture
  const bufSize = ctx.sampleRate * 0.06;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;

  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();

  noise.buffer = buf;
  noiseGain.gain.setValueAtTime(0.25, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.06);
}

function playHihat(): void {
  const ctx = getCtx();
  const t = ctx.currentTime;

  // Filtered noise burst
  const bufSize = ctx.sampleRate * 0.05;
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;

  const noise = ctx.createBufferSource();
  const bandpass = ctx.createBiquadFilter();
  const gain = ctx.createGain();

  noise.buffer = buf;

  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1200;
  bandpass.Q.value = 2;

  gain.gain.setValueAtTime(0.35, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

  noise.connect(bandpass);
  bandpass.connect(gain);
  gain.connect(ctx.destination);

  noise.start(t);
  noise.stop(t + 0.05);
}

/** Play the hit sound for a given lane (0-3) */
export function playHitSound(lane: number): void {
  try {
    switch (lane) {
      case 0:
        playKick();
        break;
      case 1:
        playSnare();
        break;
      case 2:
      case 3:
        playHihat();
        break;
    }
  } catch {
    // Silent fail if audio context not ready
  }
}

/** Resume audio context after user gesture (required by browsers) */
export async function resumeAudio(): Promise<void> {
  try {
    const ctx = getCtx();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
  } catch {
    // Silent fail
  }
}
