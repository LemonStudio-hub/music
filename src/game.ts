/**
 * Game logic - scoring, hit detection, combo, state management
 */

import { Renderer, Block, Particle } from '@/renderer';
import { NoteEvent } from '@/audio';
import { getCtx } from '@/sfx';

// Color palette for blocks - vibrant colors
const BLOCK_COLORS: Array<{ start: string; end: string }> = [
  { start: '#ff6b6b', end: '#ee5a24' }, // Red
  { start: '#feca57', end: '#ff9f43' }, // Yellow/Orange
  { start: '#48dbfb', end: '#0abde3' }, // Cyan
  { start: '#ff9ff3', end: '#f368e0' }, // Pink
  { start: '#54a0ff', end: '#2e86de' }, // Blue
  { start: '#5f27cd', end: '#341f97' }, // Purple
  { start: '#01a3a4', end: '#00b894' }, // Teal
  { start: '#ff6348', end: '#eb4d4b' }, // Orange/Red
];

export interface HitResult {
  block: Block;
  dist: number;
}

export interface LaneFlash {
  color: string;
  alpha: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  color: string;
  alpha: number;
  speed: number;
}

export class Game {
  readonly renderer: Renderer;
  blocks: Block[] = [];
  particles: Particle[] = [];
  laneFlashes: LaneFlash[] = [];
  ripples: Ripple[] = [];
  score = 0;
  combo = 0;
  maxCombo = 0;
  audioCtx: AudioContext | null = null;
  source: AudioBufferSourceNode | null = null;
  analyser: AnalyserNode | null = null;
  buffer: AudioBuffer | null = null;
  startTime = 0;
  playing = false;
  paused = false;
  pauseTime = 0;
  animId = 0;
  readonly fallDuration = 2.5;
  readonly lanes = 4;
  private _isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches;

  // Hit line pulse state
  hitLinePulse = 0;
  hitLineColor = '#fff';

  // Screen flash state
  screenFlashAlpha = 0;
  screenFlashColor = '#fff';

  constructor(renderer: Renderer) {
    this.renderer = renderer;
  }

  get isMobile(): boolean {
    return this._isMobile;
  }

  get hitLineY(): number {
    return this._isMobile ? this.renderer.h - 140 : this.renderer.h - 100;
  }

  get laneWidth(): number {
    return this.renderer.w / this.lanes;
  }

  init(audioBuffer: AudioBuffer, notes: NoteEvent[]): void {
    this.buffer = audioBuffer;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.paused = false;
    this._isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches;
    this.blocks = notes.map(note => {
      const colorSet = BLOCK_COLORS[note.lane % BLOCK_COLORS.length];
      return {
        time: note.time,
        lane: note.lane,
        y: 0,
        hit: false,
        missed: false,
        opacity: 1,
        size: 0.7 + note.intensity * 0.3,
        color: colorSet.start,
        colorEnd: colorSet.end,
        shakeX: 0,
        shakeY: 0,
        prevY: 0,
      };
    });

    this.laneFlashes = Array.from({ length: this.lanes }, () => ({
      color: '#fff',
      alpha: 0,
    }));
  }

  start(onEnd: () => void): void {
    this.audioCtx = getCtx();
    void this.audioCtx.resume();
    this.source = this.audioCtx.createBufferSource();
    this.source.buffer = this.buffer;
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.analyser.smoothingTimeConstant = 0.8;
    this.source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
    this.source.onended = (): void => {
      this.source?.disconnect();
      this.source = null;
      onEnd();
    };
    this.startTime = this.audioCtx.currentTime + this.fallDuration;
    this.source.start(this.startTime);
    this.playing = true;
  }

  getElapsed(): number {
    if (!this.audioCtx) return 0;
    return this.audioCtx.currentTime - this.startTime;
  }

  getProgress(): number {
    if (!this.buffer) return 0;
    return Math.max(0, Math.min(1, this.getElapsed() / this.buffer.duration));
  }

  updateBlocks(now: number): number {
    let activeBlocks = 0;

    // Decay lane flashes
    for (const flash of this.laneFlashes) {
      if (flash.alpha > 0) {
        flash.alpha *= 0.88;
        if (flash.alpha < 0.02) flash.alpha = 0;
      }
    }

    // Decay hit line pulse
    if (this.hitLinePulse > 0) {
      this.hitLinePulse *= 0.85;
      if (this.hitLinePulse < 0.02) this.hitLinePulse = 0;
    }

    // Decay screen flash
    if (this.screenFlashAlpha > 0) {
      this.screenFlashAlpha *= 0.8;
      if (this.screenFlashAlpha < 0.01) this.screenFlashAlpha = 0;
    }

    // Update ripples
    let rippleAlive = 0;
    for (let i = 0; i < this.ripples.length; i++) {
      const r = this.ripples[i];
      r.radius += r.speed;
      r.alpha *= 0.92;
      if (r.alpha < 0.02 || r.radius > r.maxRadius) continue;
      this.ripples[rippleAlive++] = r;
    }
    this.ripples.length = rippleAlive;

    for (const block of this.blocks) {
      block.prevY = block.y;
      const elapsed = block.time - now;
      block.y = this.hitLineY - (elapsed / this.fallDuration) * this.hitLineY;

      // Decay block shake
      if (block.shakeX !== 0 || block.shakeY !== 0) {
        block.shakeX *= 0.82;
        block.shakeY *= 0.82;
        if (Math.abs(block.shakeX) < 0.5) block.shakeX = 0;
        if (Math.abs(block.shakeY) < 0.5) block.shakeY = 0;
      }

      if (block.hit) {
        block.opacity -= 0.15;
        if (block.opacity <= 0) continue;
      }

      if (!block.hit && !block.missed && block.y > this.hitLineY + 40) {
        block.missed = true;
        this.combo = 0;
      }

      if (block.y < -50 || block.y > this.renderer.h + 50) {
        if (block.missed || block.hit) continue;
      }

      activeBlocks++;
    }
    return activeBlocks;
  }

  hitAt(lane: number): HitResult | null {
    if (this.paused) return null;
    const now = this.getElapsed();
    const hitWindow = 0.12;

    let bestBlock: Block | null = null;
    let bestDist = Infinity;

    for (const block of this.blocks) {
      if (block.hit || block.missed) continue;
      if (block.lane !== lane) continue;
      const dist = Math.abs(block.time - now);
      if (dist < hitWindow && dist < bestDist) {
        bestDist = dist;
        bestBlock = block;
      }
    }

    if (bestBlock) {
      this.registerHit(bestBlock, bestDist);
      return { block: bestBlock, dist: bestDist };
    }
    this.combo = 0;
    return null;
  }

  hitAll(): HitResult | null {
    if (this.paused) return null;
    const now = this.getElapsed();
    const hitWindow = 0.12;
    for (const block of this.blocks) {
      if (block.hit || block.missed) continue;
      const dist = Math.abs(block.time - now);
      if (dist < hitWindow) {
        this.registerHit(block, dist);
        return { block, dist };
      }
    }
    return null;
  }

  registerHit(block: Block, dist: number): void {
    block.hit = true;
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    const points = dist < 0.04 ? 3 : dist < 0.08 ? 2 : 1;
    this.score += points * (1 + Math.floor(this.combo / 10));
  }

  getHitLabel(dist: number): { text: string; color: string } {
    if (dist < 0.04) return { text: 'PERFECT', color: '#fff' };
    if (dist < 0.08) return { text: 'GREAT', color: '#ccc' };
    return { text: 'GOOD', color: '#888' };
  }

  spawnParticles(block: Block): void {
    const cx = block.lane * this.laneWidth + this.laneWidth / 2;
    const cy = this.hitLineY;

    // Block shake on hit
    block.shakeX = (Math.random() - 0.5) * 30;
    block.shakeY = (Math.random() - 0.5) * 24;

    // Screen shake based on combo
    const shakeAmount = Math.min(12 + this.combo * 1.0, 35);
    this.renderer.shake(shakeAmount);

    // Lane flash
    const flash = this.laneFlashes[block.lane];
    flash.color = block.color;
    flash.alpha = 0.6;

    // Hit line pulse
    this.hitLinePulse = 1;
    this.hitLineColor = block.color;

    // Screen flash (brief white overlay)
    this.screenFlashAlpha = 0.15 + Math.min(this.combo * 0.01, 0.1);

    // Ripple rings
    for (let i = 0; i < 2; i++) {
      this.ripples.push({
        x: cx,
        y: cy,
        radius: 10 + i * 15,
        maxRadius: this.laneWidth * 0.8 + i * 20,
        color: block.color,
        alpha: 0.6 - i * 0.2,
        speed: 3 + i * 1.5,
      });
    }

    // Main burst particles (block color)
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 4 + Math.random() * 7;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 2 + Math.random() * 5,
        life: 1,
        color: block.color,
      });
    }

    // White sparkle particles
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 6 + Math.random() * 6;
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 20,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 1 + Math.random() * 3,
        life: 0.8 + Math.random() * 0.2,
        color: '#fff',
      });
    }

    // Trail particles going upward
    for (let i = 0; i < 6; i++) {
      this.particles.push({
        x: cx + (Math.random() - 0.5) * 30,
        y: cy,
        vx: (Math.random() - 0.5) * 3,
        vy: -5 - Math.random() * 4,
        size: 3 + Math.random() * 4,
        life: 0.6 + Math.random() * 0.4,
        color: block.colorEnd,
      });
    }

    // Ring burst particles (expand outward)
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      this.particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * 8,
        vy: Math.sin(angle) * 8,
        size: 4 + Math.random() * 3,
        life: 0.5,
        color: block.color,
      });
    }
  }

  togglePause(): void {
    if (this.paused) this.resume();
    else this.pause();
  }

  pause(): void {
    this.paused = true;
    this.pauseTime = this.audioCtx?.currentTime ?? 0;
    void this.audioCtx?.suspend();
  }

  resume(): void {
    if (this.audioCtx && this.pauseTime > 0) {
      const now = this.audioCtx.currentTime;
      this.startTime += now - this.pauseTime;
    }
    this.paused = false;
    this.pauseTime = 0;
    void this.audioCtx?.resume();
  }

  stop(): void {
    if (this.source) {
      try {
        this.source.stop();
      } catch {
        /* already stopped */
      }
    }
    if (this.animId) cancelAnimationFrame(this.animId);
  }
}
