import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Game } from '../game';
import { Renderer } from '../renderer';
import { NoteEvent } from '../audio';

function createMockRenderer(): Renderer {
  const canvas = document.createElement('canvas');
  const renderer = new Renderer(canvas);
  renderer.w = 800;
  renderer.h = 600;
  return renderer;
}

function makeNotes(times: number[], lanes?: number[]): NoteEvent[] {
  return times.map((t, i) => ({
    time: t,
    lane: lanes ? lanes[i] : i % 4,
    intensity: 0.8,
  }));
}

describe('Game', () => {
  let game: Game;
  let renderer: Renderer;

  beforeEach(() => {
    renderer = createMockRenderer();
    game = new Game(renderer);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('init', () => {
    it('should initialize blocks from notes', () => {
      const buffer = { duration: 10 } as unknown as AudioBuffer;
      const notes = makeNotes([0.5, 1.0, 1.5, 2.0]);

      game.init(buffer, notes);

      expect(game.blocks).toHaveLength(4);
      expect(game.blocks[0].time).toBe(0.5);
      expect(game.blocks[1].time).toBe(1.0);
      expect(game.blocks[2].time).toBe(1.5);
      expect(game.blocks[3].time).toBe(2.0);
    });

    it('should assign lanes from notes', () => {
      const buffer = { duration: 10 } as unknown as AudioBuffer;
      const notes = makeNotes([1, 2, 3, 4], [3, 1, 0, 2]);

      game.init(buffer, notes);

      expect(game.blocks[0].lane).toBe(3);
      expect(game.blocks[1].lane).toBe(1);
      expect(game.blocks[2].lane).toBe(0);
      expect(game.blocks[3].lane).toBe(2);
    });

    it('should reset score and combo', () => {
      game.score = 100;
      game.combo = 5;
      game.maxCombo = 10;

      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));

      expect(game.score).toBe(0);
      expect(game.combo).toBe(0);
      expect(game.maxCombo).toBe(0);
    });

    it('should set block sizes based on intensity', () => {
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      const notes: NoteEvent[] = [
        { time: 1, lane: 0, intensity: 0.3 },
        { time: 2, lane: 1, intensity: 0.8 },
        { time: 3, lane: 2, intensity: 1.0 },
      ];
      game.init(buffer, notes);

      expect(game.blocks[0].size).toBeLessThan(game.blocks[2].size);
    });

    it('should assign block colors based on lane', () => {
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      const notes = makeNotes([1, 2, 3, 4], [0, 1, 2, 3]);
      game.init(buffer, notes);

      expect(game.blocks[0].color).not.toBe(game.blocks[1].color);
      expect(game.blocks[2].color).not.toBe(game.blocks[3].color);
    });
  });

  describe('hitLineY', () => {
    it('should return mobile hit line when isMobile is true', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: true })),
      );
      const mobileGame = new Game(renderer);
      expect(mobileGame.hitLineY).toBe(renderer.h - 140);
    });

    it('should return desktop hit line when isMobile is false', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const desktopGame = new Game(renderer);
      expect(desktopGame.hitLineY).toBe(renderer.h - 100);
    });
  });

  describe('laneWidth', () => {
    it('should calculate lane width from renderer width', () => {
      expect(game.laneWidth).toBe(200);
    });
  });

  describe('hitAt', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 10 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0, 1.5, 2.0, 2.5]));
      game.audioCtx = { currentTime: 2.0 } as unknown as AudioContext;
      game.startTime = 1.0;
      game.paused = false;
    });

    it('should return null when paused', () => {
      game.paused = true;
      expect(game.hitAt(0)).toBeNull();
    });

    it('should hit block within hit window', () => {
      const result = game.hitAt(0);
      expect(result).not.toBeNull();
      if (result) {
        expect(result.block.hit).toBe(true);
        expect(result.dist).toBeLessThan(0.12);
      }
    });

    it('should return null for empty lane', () => {
      game.audioCtx = { currentTime: 4.0 } as unknown as AudioContext;
      game.startTime = 1.0;
      const result = game.hitAt(3);
      expect(result).toBeNull();
    });

    it('should reset combo on miss', () => {
      game.combo = 5;
      game.audioCtx = { currentTime: 100.0 } as unknown as AudioContext;
      game.startTime = 1.0;
      game.hitAt(0);
      expect(game.combo).toBe(0);
    });
  });

  describe('hitAll', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 10 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0, 1.5, 2.0]));
      game.audioCtx = { currentTime: 2.0 } as unknown as AudioContext;
      game.startTime = 1.0;
      game.paused = false;
    });

    it('should return null when paused', () => {
      game.paused = true;
      expect(game.hitAll()).toBeNull();
    });

    it('should hit the nearest block within window', () => {
      const result = game.hitAll();
      expect(result).not.toBeNull();
      if (result) {
        expect(result.block.hit).toBe(true);
      }
    });
  });

  describe('getHitLabel', () => {
    it('should return PERFECT for dist < 0.04', () => {
      const label = game.getHitLabel(0.01);
      expect(label.text).toBe('PERFECT');
      expect(label.color).toBe('#fff');
    });

    it('should return GREAT for dist < 0.08', () => {
      const label = game.getHitLabel(0.06);
      expect(label.text).toBe('GREAT');
      expect(label.color).toBe('#ccc');
    });

    it('should return GOOD for dist >= 0.08', () => {
      const label = game.getHitLabel(0.1);
      expect(label.text).toBe('GOOD');
      expect(label.color).toBe('#888');
    });
  });

  describe('updateBlocks', () => {
    beforeEach(() => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 10 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0, 2.0]));
    });

    it('should update block positions', () => {
      game.updateBlocks(0.5);
      expect(game.blocks[0].y).toBeGreaterThan(0);
    });

    it('should mark blocks as missed when past hit line', () => {
      game.updateBlocks(4.0);
      expect(game.blocks[0].missed).toBe(true);
    });

    it('should reset combo on miss', () => {
      game.combo = 5;
      game.updateBlocks(4.0);
      expect(game.combo).toBe(0);
    });

    it('should fade hit blocks', () => {
      game.blocks[0].hit = true;
      game.blocks[0].opacity = 1;
      game.updateBlocks(1.0);
      expect(game.blocks[0].opacity).toBeLessThan(1);
    });

    it('should count active blocks', () => {
      const active = game.updateBlocks(0.5);
      expect(active).toBe(2);
    });

    it('should track prevY for motion trail', () => {
      const prevY = game.blocks[0].y;
      game.updateBlocks(0.6);
      expect(game.blocks[0].prevY).toBe(prevY);
    });
  });

  describe('spawnParticles', () => {
    it('should create particles on hit', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);
      expect(game.particles.length).toBeGreaterThanOrEqual(20);
    });

    it('should create particles with valid properties', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);

      for (const p of game.particles) {
        expect(p.life).toBeGreaterThan(0);
        expect(p.life).toBeLessThanOrEqual(1);
        expect(p.size).toBeGreaterThan(0);
        expect(typeof p.vx).toBe('number');
        expect(typeof p.vy).toBe('number');
        expect(typeof p.color).toBe('string');
      }
    });

    it('should trigger lane flash', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);
      expect(game.laneFlashes[0].alpha).toBeGreaterThan(0);
    });

    it('should trigger ripples', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);
      expect(game.ripples.length).toBe(2);
    });

    it('should trigger hit line pulse', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);
      expect(game.hitLinePulse).toBe(1);
    });

    it('should trigger screen flash', () => {
      vi.stubGlobal(
        'matchMedia',
        vi.fn(() => ({ matches: false })),
      );
      const buffer = { duration: 5 } as unknown as AudioBuffer;
      game.init(buffer, makeNotes([1.0]));
      game.spawnParticles(game.blocks[0]);
      expect(game.screenFlashAlpha).toBeGreaterThan(0);
    });
  });

  describe('pause/resume', () => {
    it('should pause the game', () => {
      game.audioCtx = { suspend: vi.fn().mockResolvedValue(undefined) } as unknown as AudioContext;
      game.pause();
      expect(game.paused).toBe(true);
    });

    it('should resume the game', () => {
      game.audioCtx = { resume: vi.fn().mockResolvedValue(undefined) } as unknown as AudioContext;
      game.paused = true;
      game.resume();
      expect(game.paused).toBe(false);
    });

    it('should toggle pause state', () => {
      game.audioCtx = {
        suspend: vi.fn().mockResolvedValue(undefined),
        resume: vi.fn().mockResolvedValue(undefined),
      } as unknown as AudioContext;
      game.paused = false;
      game.togglePause();
      expect(game.paused).toBe(true);
      game.togglePause();
      expect(game.paused).toBe(false);
    });
  });

  describe('stop', () => {
    it('should stop the audio source', () => {
      const mockSource = { stop: vi.fn() };
      game.source = mockSource as unknown as AudioBufferSourceNode;
      game.animId = 123;
      vi.spyOn(globalThis, 'cancelAnimationFrame');

      game.stop();

      expect(mockSource.stop).toHaveBeenCalled();
      expect(cancelAnimationFrame).toHaveBeenCalledWith(123);
    });

    it('should handle stop when source already stopped', () => {
      const mockSource = { stop: vi.fn(() => { throw new Error('already stopped'); }) };
      game.source = mockSource as unknown as AudioBufferSourceNode;
      expect(() => game.stop()).not.toThrow();
    });
  });

  describe('getElapsed', () => {
    it('should return 0 when audioCtx is null', () => {
      game.audioCtx = null;
      expect(game.getElapsed()).toBe(0);
    });

    it('should calculate elapsed time correctly', () => {
      game.audioCtx = { currentTime: 5.0 } as unknown as AudioContext;
      game.startTime = 2.0;
      expect(game.getElapsed()).toBe(3.0);
    });
  });

  describe('getProgress', () => {
    it('should return 0 when buffer is null', () => {
      game.buffer = null;
      expect(game.getProgress()).toBe(0);
    });

    it('should calculate progress correctly', () => {
      game.buffer = { duration: 10 } as unknown as AudioBuffer;
      game.audioCtx = { currentTime: 7.0 } as unknown as AudioContext;
      game.startTime = 2.0;
      expect(game.getProgress()).toBe(0.5);
    });

    it('should clamp progress to [0, 1]', () => {
      game.buffer = { duration: 10 } as unknown as AudioBuffer;
      game.audioCtx = { currentTime: 20.0 } as unknown as AudioContext;
      game.startTime = 2.0;
      expect(game.getProgress()).toBe(1);
    });
  });
});
