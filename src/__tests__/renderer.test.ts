import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Renderer, Block, Particle } from '../renderer';
import { mockCtx } from './setup';

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    time: 1.0,
    lane: 0,
    y: 300,
    hit: false,
    missed: false,
    opacity: 1,
    size: 1,
    color: '#ff6b6b',
    colorEnd: '#ee5a24',
    shakeX: 0,
    shakeY: 0,
    prevY: 280,
    ...overrides,
  };
}

function createMockCanvas(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  return canvas;
}

describe('Renderer', () => {
  let renderer: Renderer;

  beforeEach(() => {
    vi.clearAllMocks();
    const canvas = createMockCanvas();
    renderer = new Renderer(canvas);
    renderer.w = 800;
    renderer.h = 600;
  });

  describe('constructor', () => {
    it('should initialize with canvas', () => {
      expect(renderer.canvas).toBeDefined();
      expect(renderer.ctx).toBeDefined();
    });
  });

  describe('resize', () => {
    it('should update dimensions', () => {
      // Create renderer after setting dpr
      vi.stubGlobal('devicePixelRatio', 2);
      const freshCanvas = document.createElement('canvas');
      const freshRenderer = new Renderer(freshCanvas);

      vi.stubGlobal('innerWidth', 1024);
      vi.stubGlobal('innerHeight', 768);

      freshRenderer.resize();

      expect(freshRenderer.w).toBe(1024);
      expect(freshRenderer.h).toBe(768);
    });

    it('should scale canvas by devicePixelRatio', () => {
      vi.stubGlobal('devicePixelRatio', 2);
      const freshCanvas = document.createElement('canvas');
      const freshRenderer = new Renderer(freshCanvas);

      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 600);

      freshRenderer.resize();

      expect(freshRenderer.canvas.width).toBe(1600);
      expect(freshRenderer.canvas.height).toBe(1200);
    });

    it('should handle devicePixelRatio of 1', () => {
      vi.stubGlobal('devicePixelRatio', 1);
      const freshCanvas = document.createElement('canvas');
      const freshRenderer = new Renderer(freshCanvas);

      vi.stubGlobal('innerWidth', 800);
      vi.stubGlobal('innerHeight', 600);

      freshRenderer.resize();

      expect(freshRenderer.canvas.width).toBe(800);
      expect(freshRenderer.canvas.height).toBe(600);
    });
  });

  describe('clear', () => {
    it('should call clearRect with correct dimensions', () => {
      renderer.clear();
      expect(mockCtx.clearRect).toHaveBeenCalledWith(0, 0, 800, 600);
    });
  });

  describe('drawLanes', () => {
    it('should draw lane dividers', () => {
      renderer.drawLanes(4, 200);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalled();
      expect(mockCtx.lineTo).toHaveBeenCalled();
      expect(mockCtx.stroke).toHaveBeenCalled();
    });

    it('should draw correct number of lines for lanes', () => {
      renderer.drawLanes(4, 200);
      // 3 lines for 4 lanes (dividers between lanes)
      expect(mockCtx.moveTo).toHaveBeenCalledTimes(3);
    });
  });

  describe('drawHitLine', () => {
    it('should draw a horizontal line', () => {
      renderer.drawHitLine(500, 800);
      expect(mockCtx.beginPath).toHaveBeenCalled();
      expect(mockCtx.moveTo).toHaveBeenCalledWith(0, 500);
      expect(mockCtx.lineTo).toHaveBeenCalledWith(800, 500);
      expect(mockCtx.stroke).toHaveBeenCalled();
    });
  });

  describe('drawLaneHints', () => {
    it('should draw mobile hints when isMobile is true', () => {
      renderer.drawLaneHints(4, 200, 500, true);
      expect(mockCtx.fillText).toHaveBeenCalledTimes(4);
      expect(mockCtx.fillText).toHaveBeenCalledWith('1', 100, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('2', 300, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('3', 500, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('4', 700, 530);
    });

    it('should draw desktop hints when isMobile is false', () => {
      renderer.drawLaneHints(4, 200, 500, false);
      expect(mockCtx.fillText).toHaveBeenCalledWith('D', 100, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('F', 300, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('J', 500, 530);
      expect(mockCtx.fillText).toHaveBeenCalledWith('K', 700, 530);
    });
  });

  describe('drawBlock', () => {
    it('should draw a block at correct position', () => {
      const block = makeBlock({ lane: 1 });
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should create gradient for block', () => {
      const block = makeBlock();
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    });

    it('should set correct opacity for hit block', () => {
      const block = makeBlock({ hit: true, opacity: 0.5 });
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.globalAlpha).toBe(1);
    });

    it('should set correct opacity for missed block', () => {
      const block = makeBlock({ missed: true });
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.globalAlpha).toBe(1);
    });

    it('should use white color for hit blocks', () => {
      const block = makeBlock({ hit: true });
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.createLinearGradient).toHaveBeenCalled();
    });

    it('should apply shake offset', () => {
      const block = makeBlock({ shakeX: 5, shakeY: -3 });
      renderer.drawBlock(block, 200, 500);
      expect(mockCtx.fill).toHaveBeenCalled();
    });
  });

  describe('drawParticles', () => {
    it('should update and draw particles', () => {
      const particles: Particle[] = [
        { x: 100, y: 100, vx: 1, vy: 1, size: 3, life: 1, color: '#fff' },
      ];

      renderer.drawParticles(particles);

      expect(mockCtx.arc).toHaveBeenCalled();
      expect(mockCtx.fill).toHaveBeenCalled();
    });

    it('should update particle positions', () => {
      const particles: Particle[] = [
        { x: 100, y: 100, vx: 2, vy: 3, size: 3, life: 1, color: '#fff' },
      ];

      renderer.drawParticles(particles);

      expect(particles[0].x).toBe(102);
      expect(particles[0].y).toBe(103);
    });

    it('should apply gravity to vy', () => {
      const particles: Particle[] = [{ x: 0, y: 0, vx: 0, vy: 1, size: 3, life: 1, color: '#fff' }];

      renderer.drawParticles(particles);

      expect(particles[0].vy).toBe(1.15);
    });

    it('should decrease life', () => {
      const particles: Particle[] = [{ x: 0, y: 0, vx: 0, vy: 0, size: 3, life: 1, color: '#fff' }];

      renderer.drawParticles(particles);

      expect(particles[0].life).toBeLessThan(1);
    });

    it('should remove dead particles', () => {
      const particles: Particle[] = [
        { x: 0, y: 0, vx: 0, vy: 0, size: 3, life: 0.01, color: '#fff' },
      ];

      renderer.drawParticles(particles);

      expect(particles).toHaveLength(0);
    });

    it('should handle multiple particles', () => {
      const particles: Particle[] = [
        { x: 0, y: 0, vx: 1, vy: 0, size: 2, life: 1, color: '#fff' },
        { x: 10, y: 10, vx: 0, vy: 1, size: 3, life: 0.5, color: '#aaa' },
        { x: 20, y: 20, vx: -1, vy: -1, size: 4, life: 0.01, color: '#888' },
      ];

      renderer.drawParticles(particles);

      expect(particles).toHaveLength(2);
    });

    it('should set correct color for each particle', () => {
      const particles: Particle[] = [
        { x: 0, y: 0, vx: 0, vy: 0, size: 3, life: 1, color: '#ff0000' },
      ];

      renderer.drawParticles(particles);

      expect(mockCtx.fillStyle).toBe('#ff0000');
    });
  });
});
