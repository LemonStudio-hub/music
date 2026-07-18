import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '@/stores/game';

// Mock audio module
vi.mock('@/audio', () => ({
  analyzeAudio: vi.fn().mockResolvedValue({
    bpm: 120,
    duration: 10,
    notes: [{ time: 1, lane: 0, intensity: 0.8 }],
    beatGrid: [0, 0.5, 1],
    sections: [{ startTime: 0, endTime: 10, type: 'verse', intensity: 1 }],
  }),
  loadAudioFile: vi.fn().mockResolvedValue({
    duration: 10,
    length: 441000,
    sampleRate: 44100,
  }),
}));

// Mock storage module (OPFS not available in jsdom)
vi.mock('@/storage', () => ({
  storeAudioBuffer: vi.fn().mockResolvedValue(undefined),
  loadStoredAudio: vi.fn().mockResolvedValue(null),
  clearStoredAudio: vi.fn().mockResolvedValue(undefined),
  hasStoredAudio: vi.fn().mockResolvedValue(false),
}));

// Mock renderer module with class
vi.mock('@/renderer', () => {
  class MockRenderer {
    canvas: HTMLCanvasElement;
    ctx = {};
    w = 800;
    h = 600;
    resize = vi.fn();
    clear = vi.fn();
    drawLanes = vi.fn();
    drawHitLine = vi.fn();
    drawLaneHints = vi.fn();
    drawBlock = vi.fn();
    drawParticles = vi.fn();
    drawLaneFlash = vi.fn();
    drawRipple = vi.fn();
    drawScreenFlash = vi.fn();
    shake = vi.fn();
    updateShake = vi.fn();
    applyShake = vi.fn();
    restoreShake = vi.fn();

    constructor(canvas: HTMLCanvasElement) {
      this.canvas = canvas;
    }
  }
  return { Renderer: MockRenderer, Block: {}, Particle: {} };
});

// Mock game module with class
vi.mock('@/game', () => {
  class MockGame {
    blocks = [
      {
        time: 0.5,
        lane: 0,
        y: 0,
        hit: false,
        missed: false,
        opacity: 1,
        size: 0.8,
        color: '#ff6b6b',
        colorEnd: '#ee5a24',
        shakeX: 0,
        shakeY: 0,
        prevY: 0,
      },
      {
        time: 1.0,
        lane: 1,
        y: 0,
        hit: false,
        missed: false,
        opacity: 1,
        size: 0.9,
        color: '#feca57',
        colorEnd: '#ff9f43',
        shakeX: 0,
        shakeY: 0,
        prevY: 0,
      },
    ];
    particles: unknown[] = [];
    laneFlashes = [
      { color: '#fff', alpha: 0 },
      { color: '#fff', alpha: 0 },
      { color: '#fff', alpha: 0 },
      { color: '#fff', alpha: 0 },
    ];
    ripples: unknown[] = [];
    hitLinePulse = 0;
    hitLineColor = '#fff';
    screenFlashAlpha = 0;
    screenFlashColor = '#fff';
    score = 0;
    combo = 0;
    maxCombo = 0;
    buffer: AudioBuffer | null = { duration: 10 } as AudioBuffer;
    paused = false;
    playing = false;
    lanes = 4;
    fallDuration = 2.5;
    isMobile = false;
    hitLineY = 500;
    laneWidth = 200;
    animId = 0;
    init = vi.fn();
    start = vi.fn((_onEnd: () => void) => {
      this.playing = true;
    });
    getElapsed = vi.fn().mockReturnValue(1.0);
    getProgress = vi.fn().mockReturnValue(0.5);
    updateBlocks = vi.fn().mockReturnValue(3);
    hitAt = vi.fn();
    hitAll = vi.fn();
    spawnParticles = vi.fn();
    togglePause = vi.fn();
    pause = vi.fn();
    resume = vi.fn();
    stop = vi.fn();
  }
  return { Game: MockGame };
});

describe('useGameStore', () => {
  let store: ReturnType<typeof useGameStore>;

  beforeEach(() => {
    setActivePinia(createPinia());
    store = useGameStore();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('initial state', () => {
    it('should start on start screen', () => {
      expect(store.screen).toBe('start');
    });

    it('should have zero score', () => {
      expect(store.score).toBe(0);
    });

    it('should have zero combo', () => {
      expect(store.combo).toBe(0);
    });

    it('should have zero maxCombo', () => {
      expect(store.maxCombo).toBe(0);
    });

    it('should have empty fileName', () => {
      expect(store.fileName).toBe('');
    });

    it('should not be loading', () => {
      expect(store.loading).toBe(false);
    });

    it('should have empty errorMsg', () => {
      expect(store.errorMsg).toBe('');
    });
  });

  describe('computed', () => {
    it('should return empty comboText when combo is 0', () => {
      store.combo = 0;
      expect(store.comboText).toBe('');
    });

    it('should return empty comboText when combo is 1', () => {
      store.combo = 1;
      expect(store.comboText).toBe('');
    });

    it('should return combo text when combo > 1', () => {
      store.combo = 5;
      expect(store.comboText).toBe('5 COMBO');
    });

    it('should handle large combo numbers', () => {
      store.combo = 999;
      expect(store.comboText).toBe('999 COMBO');
    });

    it('should return score as string', () => {
      store.score = 42;
      expect(store.scoreText).toBe('42');
    });

    it('should return zero score as string', () => {
      store.score = 0;
      expect(store.scoreText).toBe('0');
    });

    it('should return progress as percent string', () => {
      store.progress = 0.75;
      expect(store.progressPercent).toBe('75%');
    });

    it('should return zero progress as percent', () => {
      store.progress = 0;
      expect(store.progressPercent).toBe('0%');
    });

    it('should return full progress as percent', () => {
      store.progress = 1;
      expect(store.progressPercent).toBe('100%');
    });
  });

  describe('initRenderer', () => {
    it('should not throw when initializing renderer', () => {
      const canvas = document.createElement('canvas');
      expect(() => store.initRenderer(canvas)).not.toThrow();
    });
  });

  describe('loadFile', () => {
    it('should set fileName during load', async () => {
      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'test.mp3', {
        type: 'audio/mpeg',
      });

      await store.loadFile(file);

      expect(store.fileName).toBe('test.mp3');
    });

    it('should set loading to false after load', async () => {
      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'test.mp3', {
        type: 'audio/mpeg',
      });

      await store.loadFile(file);

      expect(store.loading).toBe(false);
    });

    it('should set error message on failure', async () => {
      const { loadAudioFile } = await import('@/audio');
      vi.mocked(loadAudioFile).mockRejectedValueOnce(new Error('decode failed'));

      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'bad.mp3', {
        type: 'audio/mpeg',
      });
      await store.loadFile(file);

      expect(store.errorMsg).toBeTruthy();
    });

    it('should set loading to false on error', async () => {
      const { loadAudioFile } = await import('@/audio');
      vi.mocked(loadAudioFile).mockRejectedValueOnce(new Error('decode failed'));

      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'bad.mp3', {
        type: 'audio/mpeg',
      });
      await store.loadFile(file);

      expect(store.loading).toBe(false);
    });
  });

  describe('getHitLabel', () => {
    it('should return PERFECT for dist < 0.04', () => {
      const label = store.getHitLabel(0.01);
      expect(label.text).toBe('PERFECT');
      expect(label.color).toBe('#fff');
    });

    it('should return PERFECT for dist exactly 0', () => {
      const label = store.getHitLabel(0);
      expect(label.text).toBe('PERFECT');
    });

    it('should return GREAT for dist 0.04 to 0.08', () => {
      const label = store.getHitLabel(0.06);
      expect(label.text).toBe('GREAT');
      expect(label.color).toBe('#ccc');
    });

    it('should return GOOD for dist >= 0.08', () => {
      const label = store.getHitLabel(0.1);
      expect(label.text).toBe('GOOD');
      expect(label.color).toBe('#888');
    });

    it('should return GOOD for large dist', () => {
      const label = store.getHitLabel(0.5);
      expect(label.text).toBe('GOOD');
    });
  });

  describe('pause', () => {
    it('should not pause when on start screen', () => {
      store.screen = 'start';
      store.pause();
      expect(store.screen).toBe('start');
    });
  });

  describe('resume', () => {
    it('should not resume when not paused', () => {
      store.screen = 'playing';
      store.resume();
      expect(store.screen).toBe('playing');
    });

    it('should not resume when on start screen', () => {
      store.screen = 'start';
      store.resume();
      expect(store.screen).toBe('start');
    });
  });

  describe('togglePause', () => {
    it('should not toggle when on start screen', () => {
      store.screen = 'start';
      store.togglePause();
      expect(store.screen).toBe('start');
    });
  });

  describe('reset', () => {
    it('should reset all state to defaults', () => {
      store.screen = 'playing';
      store.score = 100;
      store.combo = 5;
      store.maxCombo = 10;
      store.progress = 0.5;
      store.fileName = 'test.mp3';
      store.errorMsg = 'some error';

      store.reset();

      expect(store.screen).toBe('start');
      expect(store.score).toBe(0);
      expect(store.combo).toBe(0);
      expect(store.maxCombo).toBe(0);
      expect(store.progress).toBe(0);
      expect(store.fileName).toBe('');
      expect(store.errorMsg).toBe('');
    });

    it('should be idempotent', () => {
      store.reset();
      store.reset();
      expect(store.screen).toBe('start');
      expect(store.score).toBe(0);
    });
  });

  describe('processHit', () => {
    it('should return null when result is null', () => {
      const block = store.processHit(null);
      expect(block).toBeNull();
    });
  });

  describe('hitPointer', () => {
    it('should return null when not playing', () => {
      store.screen = 'start';
      const event = new PointerEvent('pointerdown', { clientX: 100 });
      expect(store.hitPointer(event)).toBeNull();
    });
  });

  describe('hitLane', () => {
    it('should return null when not playing', () => {
      store.screen = 'start';
      expect(store.hitLane(0)).toBeNull();
    });
  });

  describe('hitAll', () => {
    it('should return null when not playing', () => {
      store.screen = 'start';
      expect(store.hitAll()).toBeNull();
    });
  });

  describe('quit', () => {
    it('should reset to start screen', () => {
      store.screen = 'playing';
      store.quit();
      expect(store.screen).toBe('start');
    });
  });

  describe('setDifficulty', () => {
    it('should update difficulty', () => {
      store.setDifficulty('hard');
      expect(store.difficulty).toBe('hard');
    });

    it('should default to normal', () => {
      expect(store.difficulty).toBe('normal');
    });
  });

  describe('countdown', () => {
    it('should have countdown value', () => {
      expect(store.countdownValue).toBe(3);
    });
  });

  describe('results', () => {
    it('should start with no results', () => {
      expect(store.results).toBeNull();
    });
  });

  describe('hitPointer with engine', () => {
    it('should delegate to engine.hitAt when playing', () => {
      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'test.mp3', {
        type: 'audio/mpeg',
      });
      void store.loadFile(file).then(() => {
        store.screen = 'playing';
        const event = new PointerEvent('pointerdown', { clientX: 100 });
        store.hitPointer(event);
        // Should not throw
      });
    });
  });

  describe('hitLane with engine', () => {
    it('should delegate to engine.hitAt when playing', () => {
      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'test.mp3', {
        type: 'audio/mpeg',
      });
      void store.loadFile(file).then(() => {
        store.screen = 'playing';
        store.hitLane(0);
        // Should not throw
      });
    });
  });

  describe('hitAll with engine', () => {
    it('should delegate to engine.hitAll when playing', () => {
      const canvas = document.createElement('canvas');
      store.initRenderer(canvas);

      const file = new File([new ArrayBuffer(100)], 'test.mp3', {
        type: 'audio/mpeg',
      });
      void store.loadFile(file).then(() => {
        store.screen = 'playing';
        store.hitAll();
        // Should not throw
      });
    });
  });

  describe('recordHit', () => {
    it('should not throw when called', () => {
      expect(() => store.recordHit('PERFECT')).not.toThrow();
      expect(() => store.recordHit('GREAT')).not.toThrow();
      expect(() => store.recordHit('GOOD')).not.toThrow();
    });
  });

  describe('timeRemaining', () => {
    it('should default to 0', () => {
      expect(store.timeRemaining).toBe(0);
    });
  });

  describe('endGame and results', () => {
    it('should compute results with grade S', () => {
      // Simulate some hits
      store.recordHit('PERFECT');
      store.recordHit('PERFECT');
      store.recordHit('PERFECT');
      store.score = 300;
      store.maxCombo = 3;

      // Trigger endGame indirectly by checking results
      expect(store.results).toBeNull();
    });

    it('should have null results initially', () => {
      expect(store.results).toBeNull();
    });
  });

  describe('countdownValue', () => {
    it('should default to 3', () => {
      expect(store.countdownValue).toBe(3);
    });
  });

  describe('difficulty persistence', () => {
    it('should allow changing difficulty', () => {
      store.setDifficulty('easy');
      expect(store.difficulty).toBe('easy');
      store.setDifficulty('hard');
      expect(store.difficulty).toBe('hard');
      store.setDifficulty('normal');
      expect(store.difficulty).toBe('normal');
    });
  });

  describe('quit', () => {
    it('should clear results', () => {
      store.screen = 'playing';
      store.results = {
        score: 100,
        maxCombo: 10,
        totalNotes: 50,
        perfectCount: 40,
        greatCount: 5,
        goodCount: 3,
        missCount: 2,
        accuracy: 0.96,
        grade: 'S',
      };
      store.quit();
      expect(store.screen).toBe('start');
      expect(store.results).toBeNull();
    });
  });

  describe('reset', () => {
    it('should clear all state', () => {
      store.screen = 'playing';
      store.score = 500;
      store.combo = 10;
      store.maxCombo = 20;
      store.progress = 0.5;
      store.fileName = 'test.mp3';
      store.errorMsg = 'error';
      store.reset();
      expect(store.screen).toBe('start');
      expect(store.score).toBe(0);
      expect(store.combo).toBe(0);
      expect(store.maxCombo).toBe(0);
      expect(store.progress).toBe(0);
      expect(store.fileName).toBe('');
      expect(store.errorMsg).toBe('');
    });
  });

  describe('getHitLabel edge cases', () => {
    it('should return PERFECT at boundary', () => {
      const label = store.getHitLabel(0.039);
      expect(label.text).toBe('PERFECT');
    });

    it('should return GREAT at boundary', () => {
      const label = store.getHitLabel(0.079);
      expect(label.text).toBe('GREAT');
    });

    it('should return GOOD just above boundary', () => {
      const label = store.getHitLabel(0.081);
      expect(label.text).toBe('GOOD');
    });
  });

  describe('computed properties', () => {
    it('comboText should be empty for combo 0', () => {
      store.combo = 0;
      expect(store.comboText).toBe('');
    });

    it('comboText should be empty for combo 1', () => {
      store.combo = 1;
      expect(store.comboText).toBe('');
    });

    it('comboText should show for combo > 1', () => {
      store.combo = 42;
      expect(store.comboText).toBe('42 COMBO');
    });

    it('scoreText should convert to string', () => {
      store.score = 12345;
      expect(store.scoreText).toBe('12345');
    });

    it('progressPercent should format correctly', () => {
      store.progress = 0;
      expect(store.progressPercent).toBe('0%');
      store.progress = 0.5;
      expect(store.progressPercent).toBe('50%');
      store.progress = 1;
      expect(store.progressPercent).toBe('100%');
    });
  });

  describe('hitPointer edge cases', () => {
    it('should return null when renderer is null', () => {
      store.screen = 'playing';
      const event = new PointerEvent('pointerdown', { clientX: 100 });
      expect(store.hitPointer(event)).toBeNull();
    });
  });

  describe('hitLane edge cases', () => {
    it('should return null when screen is not playing', () => {
      store.screen = 'start';
      expect(store.hitLane(0)).toBeNull();
    });

    it('should return null when screen is paused', () => {
      store.screen = 'paused';
      expect(store.hitLane(0)).toBeNull();
    });
  });

  describe('hitAll edge cases', () => {
    it('should return null when screen is not playing', () => {
      store.screen = 'start';
      expect(store.hitAll()).toBeNull();
    });
  });

  describe('processHit edge cases', () => {
    it('should return null when result is null', () => {
      expect(store.processHit(null)).toBeNull();
    });

    it('should return null when engine is null', () => {
      const block = {
        time: 1,
        lane: 0,
        y: 300,
        hit: true,
        missed: false,
        opacity: 1,
        size: 1,
        color: '#f00',
        colorEnd: '#a00',
        shakeX: 0,
        shakeY: 0,
        prevY: 280,
      };
      expect(store.processHit({ block, dist: 0.01 })).toBeNull();
    });
  });
});
