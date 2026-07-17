import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { analyzeAudio, loadAudioFile, NoteEvent } from '../audio';
import { Renderer, Block } from '../renderer';
import { Game, HitResult } from '../game';

export const useGameStore = defineStore('game', () => {
  // UI state
  const screen = ref<'start' | 'playing' | 'paused' | 'ended'>('start');
  const score = ref(0);
  const combo = ref(0);
  const maxCombo = ref(0);
  const progress = ref(0);
  const fileName = ref('');
  const loading = ref(false);
  const errorMsg = ref('');

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

    // If audio was loaded before renderer, start game now
    if (pendingBuffer && pendingNotes) {
      startGame(pendingBuffer, pendingNotes);
      pendingBuffer = null;
      pendingNotes = null;
    }
  }

  async function loadFile(file: File): Promise<void> {
    loading.value = true;
    errorMsg.value = '';
    fileName.value = file.name;

    try {
      const audioBuffer = await loadAudioFile(file);
      const analysis = await analyzeAudio(audioBuffer, 'normal');

      if (renderer) {
        startGame(audioBuffer, analysis.notes);
      } else {
        pendingBuffer = audioBuffer;
        pendingNotes = analysis.notes;
        screen.value = 'playing';
      }
    } catch (err: unknown) {
      errorMsg.value = '无法解析该音频文件';
      console.error(err);
    } finally {
      loading.value = false;
    }
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
    screen.value = 'ended';
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

  return {
    screen,
    score,
    combo,
    maxCombo,
    progress,
    fileName,
    loading,
    errorMsg,
    comboText,
    scoreText,
    progressPercent,
    initRenderer,
    loadFile,
    processHit,
    hitPointer,
    hitLane,
    hitAll,
    getHitLabel,
    pause,
    resume,
    togglePause,
    restart,
    reset,
  };
});
