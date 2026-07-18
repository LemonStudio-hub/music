import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { analyzeAudio, loadAudioFile, NoteEvent } from '@/audio';
import { Renderer, Block } from '@/renderer';
import { Game, HitResult } from '@/game';
import { resumeAudio } from '@/sfx';
import { storeAudioBuffer, loadStoredAudio, clearStoredAudio, hasStoredAudio } from '@/storage';
import { i18n } from '@/i18n';

export type Difficulty = 'easy' | 'normal' | 'hard';
export type Screen = 'start' | 'countdown' | 'playing' | 'paused' | 'results';

export interface GameResults {
  score: number;
  maxCombo: number;
  totalNotes: number;
  perfectCount: number;
  greatCount: number;
  goodCount: number;
  missCount: number;
  accuracy: number;
  grade: string;
}

export const useGameStore = defineStore('game', () => {
  // UI state
  const screen = ref<Screen>('start');
  const score = ref(0);
  const combo = ref(0);
  const maxCombo = ref(0);
  const progress = ref(0);
  const fileName = ref('');
  const loading = ref(false);
  const errorMsg = ref('');
  const hasStored = ref(false);
  const restoring = ref(false);
  const difficulty = ref<Difficulty>('normal');
  const countdownValue = ref(3);
  const loadPhase = ref<'reading' | 'decoding' | 'analyzing' | ''>('');
  const loadPercent = ref(0);
  const timeRemaining = ref(0);
  const results = ref<GameResults | null>(null);

  // Hit stats for results
  let hitStats = { perfect: 0, great: 0, good: 0, miss: 0, total: 0 };

  // Internal game engine
  let engine: Game | null = null;
  let renderer: Renderer | null = null;
  let animId = 0;

  // Pending game data (set when audio is loaded before renderer is ready)
  let pendingBuffer: AudioBuffer | null = null;
  let pendingNotes: NoteEvent[] | null = null;

  const comboText = computed(() => (combo.value > 1 ? `${String(combo.value)} COMBO` : ''));
  const scoreText = computed(() => String(score.value));
  const progressPercent = computed(() => `${String(progress.value * 100)}%`);

  function initRenderer(canvas: HTMLCanvasElement): void {
    renderer = new Renderer(canvas);
    renderer.resize();
    window.addEventListener('resize', () => renderer?.resize());

    if (pendingBuffer && pendingNotes) {
      beginCountdown(pendingBuffer, pendingNotes);
      pendingBuffer = null;
      pendingNotes = null;
    }
  }

  function beginCountdown(audioBuffer: AudioBuffer, notes: NoteEvent[]): void {
    countdownValue.value = 3;
    screen.value = 'countdown';
    hitStats = { perfect: 0, great: 0, good: 0, miss: 0, total: notes.length };

    const tick = (): void => {
      if (countdownValue.value > 1) {
        countdownValue.value--;
        setTimeout(tick, 700);
      } else {
        startGame(audioBuffer, notes);
      }
    };
    setTimeout(tick, 700);
  }

  async function loadFile(file: File): Promise<void> {
    loading.value = true;
    errorMsg.value = '';
    fileName.value = file.name;
    loadPhase.value = 'reading';
    loadPercent.value = 0;

    try {
      await resumeAudio();
      const audioBuffer = await loadAudioFile(file, p => {
        loadPercent.value = p;
      });
      loadPhase.value = 'analyzing';
      loadPercent.value = 0;
      const analysis = await analyzeAudio(audioBuffer, difficulty.value, p => {
        loadPercent.value = p;
      });

      void storeAudioBuffer(audioBuffer, file.name).then(() => {
        hasStored.value = true;
      });

      if (renderer) {
        beginCountdown(audioBuffer, analysis.notes);
      } else {
        pendingBuffer = audioBuffer;
        pendingNotes = analysis.notes;
        screen.value = 'countdown';
      }
    } catch (err: unknown) {
      errorMsg.value = i18n.global.t('start.errorParse');
      console.error(err);
    } finally {
      loading.value = false;
      loadPhase.value = '';
    }
  }

  async function restoreStored(): Promise<void> {
    if (restoring.value) return;
    restoring.value = true;
    errorMsg.value = '';
    loadPhase.value = 'analyzing';
    loadPercent.value = 0;

    try {
      await resumeAudio();
      const result = await loadStoredAudio();
      if (!result) {
        hasStored.value = false;
        return;
      }

      fileName.value = result.fileName;
      const analysis = await analyzeAudio(result.buffer, difficulty.value, p => {
        loadPercent.value = p;
      });

      if (renderer) {
        beginCountdown(result.buffer, analysis.notes);
      } else {
        pendingBuffer = result.buffer;
        pendingNotes = analysis.notes;
        screen.value = 'countdown';
      }
    } catch (err: unknown) {
      errorMsg.value = i18n.global.t('start.errorRestore');
      console.error(err);
      hasStored.value = false;
    } finally {
      restoring.value = false;
      loadPhase.value = '';
    }
  }

  async function clearStored(): Promise<void> {
    await clearStoredAudio();
    hasStored.value = false;
    fileName.value = '';
  }

  async function checkStored(): Promise<void> {
    hasStored.value = await hasStoredAudio();
  }

  function startGame(audioBuffer: AudioBuffer, notes: NoteEvent[]): void {
    if (!renderer) return;

    engine = new Game(renderer);
    engine.init(audioBuffer, notes);

    score.value = 0;
    combo.value = 0;
    maxCombo.value = 0;
    progress.value = 0;
    screen.value = 'playing';

    engine.start(() => endGame());
    loop();
  }

  function loop(): void {
    if (!engine || !renderer || engine.paused) return;
    const now = engine.getElapsed();

    // Update screen shake
    renderer.updateShake();

    renderer.clear();
    renderer.applyShake();

    renderer.drawLanes(engine.lanes, engine.laneWidth);

    // Draw lane flashes
    for (let i = 0; i < engine.laneFlashes.length; i++) {
      const flash = engine.laneFlashes[i];
      renderer.drawLaneFlash(i, engine.laneWidth, engine.hitLineY, flash.color, flash.alpha);
    }

    renderer.drawHitLine(engine.hitLineY, renderer.w, engine.hitLinePulse, engine.hitLineColor);
    renderer.drawLaneHints(engine.lanes, engine.laneWidth, engine.hitLineY, engine.isMobile);

    engine.updateBlocks(now);

    for (const block of engine.blocks) {
      if (block.opacity <= 0) continue;
      renderer.drawBlock(block, engine.laneWidth, engine.hitLineY);
    }

    // Draw ripples
    for (const ripple of engine.ripples) {
      renderer.drawRipple(ripple.x, ripple.y, ripple.radius, ripple.color, ripple.alpha);
    }

    renderer.drawParticles(engine.particles);

    // Draw screen flash on top
    renderer.drawScreenFlash(engine.screenFlashColor, engine.screenFlashAlpha);

    renderer.restoreShake();

    progress.value = engine.getProgress();
    if (engine.buffer) {
      timeRemaining.value = Math.max(0, Math.ceil(engine.buffer.duration - engine.getElapsed()));
    }

    if (engine.getProgress() < 1) {
      animId = requestAnimationFrame(loop);
    }
  }

  function processHit(result: HitResult | null): Block | null {
    if (!result || !engine) return null;
    engine.spawnParticles(result.block);
    score.value = engine.score;
    combo.value = engine.combo;
    maxCombo.value = engine.maxCombo;
    return result.block;
  }

  function hitPointer(e: PointerEvent): { block: Block; dist: number } | null {
    if (!engine || !renderer || screen.value !== 'playing') return null;
    const lane = Math.floor(e.clientX / engine.laneWidth);
    return engine.hitAt(lane);
  }

  function hitLane(lane: number): { block: Block; dist: number } | null {
    if (!engine || screen.value !== 'playing') return null;
    return engine.hitAt(lane);
  }

  function hitAll(): { block: Block; dist: number } | null {
    if (!engine || screen.value !== 'playing') return null;
    return engine.hitAll();
  }

  function getHitLabel(dist: number): { text: string; color: string } {
    if (dist < 0.04) return { text: 'PERFECT', color: '#fff' };
    if (dist < 0.08) return { text: 'GREAT', color: '#ccc' };
    return { text: 'GOOD', color: '#888' };
  }

  function pause(): void {
    if (!engine || screen.value !== 'playing') return;
    engine.pause();
    screen.value = 'paused';
  }

  function resume(): void {
    if (!engine || screen.value !== 'paused') return;
    engine.resume();
    screen.value = 'playing';
    loop();
  }

  function togglePause(): void {
    if (screen.value === 'playing') pause();
    else if (screen.value === 'paused') resume();
  }

  function restart(): void {
    if (!engine) return;
    engine.stop();
    cancelAnimationFrame(animId);
    const buffer = engine.buffer;
    const blocks = engine.blocks;
    if (!buffer) return;

    const notes = blocks.map(b => ({ time: b.time, lane: b.lane, intensity: 1 }));
    startGame(buffer, notes);
  }

  function endGame(): void {
    if (engine) {
      // Count misses from blocks that weren't hit
      for (const block of engine.blocks) {
        if (block.missed) hitStats.miss++;
      }
    }

    const totalNotes = hitStats.total;
    const hitCount = hitStats.perfect + hitStats.great + hitStats.good;
    const accuracy = totalNotes > 0 ? hitCount / totalNotes : 0;

    let grade: string;
    if (accuracy >= 0.95) grade = 'S';
    else if (accuracy >= 0.9) grade = 'A';
    else if (accuracy >= 0.8) grade = 'B';
    else if (accuracy >= 0.7) grade = 'C';
    else grade = 'D';

    results.value = {
      score: score.value,
      maxCombo: maxCombo.value,
      totalNotes,
      perfectCount: hitStats.perfect,
      greatCount: hitStats.great,
      goodCount: hitStats.good,
      missCount: hitStats.miss,
      accuracy,
      grade,
    };

    screen.value = 'results';
  }

  function recordHit(label: string): void {
    if (label === 'PERFECT') hitStats.perfect++;
    else if (label === 'GREAT') hitStats.great++;
    else if (label === 'GOOD') hitStats.good++;
  }

  function reset(): void {
    if (engine) engine.stop();
    cancelAnimationFrame(animId);
    engine = null;
    screen.value = 'start';
    score.value = 0;
    combo.value = 0;
    maxCombo.value = 0;
    progress.value = 0;
    fileName.value = '';
    errorMsg.value = '';
  }

  function quit(): void {
    if (engine) engine.stop();
    cancelAnimationFrame(animId);
    engine = null;
    screen.value = 'start';
    results.value = null;
  }

  function setDifficulty(d: Difficulty): void {
    difficulty.value = d;
  }

  return {
    screen,
    score,
    combo,
    maxCombo,
    progress,
    fileName,
    loading,
    errorMsg,
    hasStored,
    restoring,
    difficulty,
    countdownValue,
    loadPhase,
    loadPercent,
    timeRemaining,
    results,
    comboText,
    scoreText,
    progressPercent,
    setDifficulty,
    initRenderer,
    loadFile,
    restoreStored,
    clearStored,
    checkStored,
    processHit,
    recordHit,
    hitPointer,
    hitLane,
    hitAll,
    getHitLabel,
    pause,
    resume,
    togglePause,
    restart,
    quit,
    reset,
  };
});
