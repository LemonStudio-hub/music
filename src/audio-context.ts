/**
 * Shared AudioContext factory with webkit fallback
 */

interface WindowWithWebkitAudio {
  AudioContext?: typeof AudioContext;
  webkitAudioContext?: typeof AudioContext;
}

export function createAudioContext(): AudioContext {
  const win = window as unknown as WindowWithWebkitAudio;
  const AudioCtx = win.AudioContext ?? win.webkitAudioContext;
  if (!AudioCtx) throw new Error('AudioContext not supported');
  return new AudioCtx();
}
