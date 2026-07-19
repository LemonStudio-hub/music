/**
 * Canvas renderer - draws lanes, blocks, particles, hit line
 */

export interface Block {
  time: number;
  lane: number;
  y: number;
  hit: boolean;
  missed: boolean;
  opacity: number;
  size: number;
  color: string;
  colorEnd: string;
  shakeX: number;
  shakeY: number;
  prevY: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
}

const LANE_COLORS = [
  'rgba(167, 139, 250, 0.12)', // purple
  'rgba(96, 165, 250, 0.12)', // blue
  'rgba(52, 211, 153, 0.12)', // green
  'rgba(251, 191, 36, 0.12)', // yellow
];

const LANE_PRESS_COLORS = [
  'rgba(167, 139, 250, 0.5)',
  'rgba(96, 165, 250, 0.5)',
  'rgba(52, 211, 153, 0.5)',
  'rgba(251, 191, 36, 0.5)',
];

export class Renderer {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  w = 0;
  h = 0;
  private readonly dpr: number;

  // Screen shake state
  private shakeIntensity = 0;
  private shakeDecay = 0.9;
  private shakeOffsetX = 0;
  private shakeOffsetY = 0;

  // Lane press feedback
  private lanePressAlpha = [0, 0, 0, 0];

  // BPM pulse
  private bpmPulse = 0;

  // Combo energy (0-1)
  comboEnergy = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;
    this.dpr = window.devicePixelRatio || 1;
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    this.w = parent ? parent.clientWidth : window.innerWidth;
    this.h = parent ? parent.clientHeight : window.innerHeight;
    this.canvas.width = this.w * this.dpr;
    this.canvas.height = this.h * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  shake(intensity: number): void {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
  }

  updateShake(): void {
    if (this.shakeIntensity > 0.5) {
      this.shakeOffsetX = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeOffsetY = (Math.random() - 0.5) * this.shakeIntensity;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeIntensity = 0;
      this.shakeOffsetX = 0;
      this.shakeOffsetY = 0;
    }
  }

  applyShake(): void {
    this.ctx.save();
    this.ctx.translate(this.shakeOffsetX, this.shakeOffsetY);
  }

  restoreShake(): void {
    this.ctx.restore();
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h);
  }

  pressLane(lane: number): void {
    if (lane >= 0 && lane < 4) {
      this.lanePressAlpha[lane] = 1;
    }
  }

  triggerBpmPulse(): void {
    this.bpmPulse = 1;
  }

  // Background with radial gradient and combo energy
  drawBackground(hitLineY: number): void {
    const ctx = this.ctx;
    const w = this.w;
    const h = this.h;

    // Base radial gradient centered on hit line
    const grad = ctx.createRadialGradient(w / 2, hitLineY, 0, w / 2, hitLineY, h * 0.8);
    const energyR = Math.round(8 + this.comboEnergy * 20);
    const energyG = Math.round(8 + this.comboEnergy * 5);
    const energyB = Math.round(10 + this.comboEnergy * 15);
    grad.addColorStop(0, `rgb(${String(energyR)},${String(energyG)},${String(energyB)})`);
    grad.addColorStop(1, '#040406');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Subtle vignette
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
    vignette.addColorStop(0, 'transparent');
    vignette.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }

  // Lane bottom color blocks
  drawLaneBases(lanes: number, laneWidth: number, hitLineY: number): void {
    const ctx = this.ctx;
    const baseH = 60;
    for (let i = 0; i < lanes; i++) {
      const x = i * laneWidth;

      // Lane base color
      const grad = ctx.createLinearGradient(x, hitLineY - baseH, x, hitLineY + 40);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.5, LANE_COLORS[i]);
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.fillRect(x, hitLineY - baseH, laneWidth, baseH + 40);
    }
  }

  drawLanes(lanes: number, laneWidth: number): void {
    const ctx = this.ctx;
    // Subtle lane dividers
    for (let i = 1; i < lanes; i++) {
      const x = i * laneWidth;
      const grad = ctx.createLinearGradient(x, 0, x, this.h);
      grad.addColorStop(0, 'rgba(255,255,255,0.01)');
      grad.addColorStop(0.7, 'rgba(255,255,255,0.04)');
      grad.addColorStop(1, 'rgba(255,255,255,0.02)');
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.h);
      ctx.stroke();
    }
  }

  // Lane press feedback
  drawLanePress(lanes: number, laneWidth: number, hitLineY: number): void {
    const ctx = this.ctx;
    for (let i = 0; i < lanes; i++) {
      if (this.lanePressAlpha[i] <= 0.01) continue;
      const x = i * laneWidth;
      const grad = ctx.createLinearGradient(x, hitLineY - 100, x, hitLineY + 30);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(0.6, LANE_PRESS_COLORS[i]);
      grad.addColorStop(1, 'transparent');
      ctx.globalAlpha = this.lanePressAlpha[i] * 0.6;
      ctx.fillStyle = grad;
      ctx.fillRect(x, hitLineY - 100, laneWidth, 130);
      ctx.globalAlpha = 1;
      this.lanePressAlpha[i] *= 0.85;
    }
  }

  drawLaneFlash(
    lane: number,
    laneWidth: number,
    hitLineY: number,
    color: string,
    alpha: number,
  ): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    const x = lane * laneWidth;

    // Full lane glow from top to hit line
    const gradient = ctx.createLinearGradient(x, 0, x, hitLineY);
    gradient.addColorStop(0, 'transparent');
    gradient.addColorStop(0.4, color);
    gradient.addColorStop(1, color);

    ctx.globalAlpha = alpha * 0.3;
    ctx.fillStyle = gradient;
    ctx.fillRect(x, 0, laneWidth, hitLineY);

    // Bright flash at hit line
    const flashGradient = ctx.createLinearGradient(x, hitLineY - 80, x, hitLineY + 20);
    flashGradient.addColorStop(0, 'transparent');
    flashGradient.addColorStop(0.5, color);
    flashGradient.addColorStop(1, 'transparent');

    ctx.globalAlpha = alpha * 0.7;
    ctx.fillStyle = flashGradient;
    ctx.fillRect(x, hitLineY - 80, laneWidth, 100);

    ctx.globalAlpha = 1;
  }

  drawHitLine(hitLineY: number, width: number, pulse = 0, color = '#fff'): void {
    const ctx = this.ctx;
    const effectivePulse = Math.max(pulse, this.bpmPulse * 0.25);

    // Wide glow zone under hit line
    const glowH = 50 * (1 + effectivePulse * 1.5);
    const glowGrad = ctx.createLinearGradient(0, hitLineY - glowH, 0, hitLineY + glowH);
    glowGrad.addColorStop(0, 'transparent');
    glowGrad.addColorStop(0.35, color);
    glowGrad.addColorStop(0.5, color);
    glowGrad.addColorStop(0.65, color);
    glowGrad.addColorStop(1, 'transparent');
    ctx.globalAlpha = 0.12 + effectivePulse * 0.35;
    ctx.fillStyle = glowGrad;
    ctx.fillRect(0, hitLineY - glowH, width, glowH * 2);
    ctx.globalAlpha = 1;

    // Main line
    ctx.strokeStyle = color;
    ctx.lineWidth = 2 + effectivePulse * 4;
    ctx.globalAlpha = 0.3 + effectivePulse * 0.6;
    ctx.beginPath();
    ctx.moveTo(0, hitLineY);
    ctx.lineTo(width, hitLineY);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // BPM pulse decay - snappier
    this.bpmPulse *= 0.88;
  }

  drawRipple(x: number, y: number, radius: number, color: string, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  drawScreenFlash(color: string, alpha: number): void {
    if (alpha <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.w, this.h);
    ctx.globalAlpha = 1;
  }

  // Beat grid lines - subtle horizontal lines marking beat positions
  drawBeatGrid(
    lanes: number,
    laneWidth: number,
    hitLineY: number,
    fallDuration: number,
    bpm: number,
    now: number,
  ): void {
    if (bpm <= 0) return;
    const ctx = this.ctx;
    const beatInterval = 60 / bpm;

    // Calculate which beats are visible on screen
    const lookAhead = fallDuration;
    const firstBeat = Math.floor((now) / beatInterval);
    const lastBeat = Math.ceil((now + lookAhead) / beatInterval);

    for (let i = firstBeat; i <= lastBeat; i++) {
      if (i < 0) continue;
      const beatTime = i * beatInterval;
      const elapsed = beatTime - now;
      const y = hitLineY - (elapsed / fallDuration) * hitLineY;

      // Only draw if on screen
      if (y < -20 || y > hitLineY + 10) continue;

      // Stronger line on downbeats (every 4th beat)
      const isDownbeat = i % 4 === 0;
      ctx.globalAlpha = isDownbeat ? 0.08 : 0.035;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = isDownbeat ? 1.5 : 0.8;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(lanes * laneWidth, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  // Proximity glow: blocks near the hit line get brighter
  drawProximityGlow(hitLineY: number, width: number, fallDuration: number, bpm: number): void {
    const ctx = this.ctx;
    // Pulsing zone near hit line synced to BPM
    const pulse = this.bpmPulse;
    const glowH = 80 + pulse * 40;

    const grad = ctx.createLinearGradient(0, hitLineY - glowH, 0, hitLineY);
    grad.addColorStop(0, 'transparent');
    grad.addColorStop(0.7, `rgba(255,255,255,${String(0.02 + pulse * 0.04)})`);
    grad.addColorStop(1, `rgba(255,255,255,${String(0.04 + pulse * 0.06)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, hitLineY - glowH, width, glowH);
  }

  drawLaneHints(lanes: number, laneWidth: number, hitLineY: number, isMobile: boolean): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    const hints: string[] = isMobile ? ['1', '2', '3', '4'] : ['D', 'F', 'J', 'K'];
    for (let i = 0; i < lanes; i++) {
      ctx.fillText(hints[i], i * laneWidth + laneWidth / 2, hitLineY + 28);
    }
  }

  drawBlock(block: Block, laneWidth: number, hitLineY: number): void {
    const ctx = this.ctx;
    const x = block.lane * laneWidth + laneWidth * 0.12 + block.shakeX;
    const bw = laneWidth * 0.76;
    const bh = 36 * block.size;
    const by = block.y + block.shakeY;
    const r = 8;

    // Skip blocks fully off-screen
    if (by + bh / 2 < -50 || by - bh / 2 > this.h + 50) return;

    const alpha = block.hit ? block.opacity : block.missed ? 0.12 : 1;

    // Proximity factor: blocks glow brighter near the hit line
    const distToHit = Math.abs(hitLineY - by);
    const proximity = Math.max(0, 1 - distToHit / (hitLineY * 0.4));

    // Slight scale-up near hit line for juicy feel
    const scaleBoost = block.hit ? 1 : 1 + proximity * 0.06;
    const scaledBh = bh * scaleBoost;
    const scaledBw = bw * scaleBoost;
    const adjX = x - (scaledBw - bw) / 2;
    const adjBy = by;

    // Motion trail - longer and brighter near hit line
    if (!block.hit && !block.missed && block.prevY !== block.y) {
      const speed = Math.abs(block.y - block.prevY);
      const trailLen = Math.min(speed * (0.6 + proximity * 0.4), 55);
      if (trailLen > 2) {
        const trailGrad = ctx.createLinearGradient(x, by - bh / 2 - trailLen, x, by - bh / 2);
        trailGrad.addColorStop(0, 'transparent');
        trailGrad.addColorStop(1, block.color);
        ctx.globalAlpha = alpha * (0.2 + proximity * 0.2);
        ctx.fillStyle = trailGrad;
        ctx.fillRect(x + 4, by - bh / 2 - trailLen, bw - 8, trailLen);
      }
    }

    ctx.globalAlpha = alpha;

    // Glow - intensifies near hit line
    if (!block.missed) {
      ctx.shadowColor = block.hit ? '#fff' : block.color;
      ctx.shadowBlur = block.hit ? 20 : 12 + proximity * 10;
    }

    // Main body gradient (use scaled dimensions)
    const bodyGrad = ctx.createLinearGradient(adjX, adjBy - scaledBh / 2, adjX + scaledBw, adjBy + scaledBh / 2);
    if (block.hit) {
      bodyGrad.addColorStop(0, '#fff');
      bodyGrad.addColorStop(0.5, '#fff');
      bodyGrad.addColorStop(1, '#ddd');
    } else if (block.missed) {
      bodyGrad.addColorStop(0, '#444');
      bodyGrad.addColorStop(1, '#333');
    } else {
      bodyGrad.addColorStop(0, block.color);
      bodyGrad.addColorStop(0.4, block.color);
      bodyGrad.addColorStop(1, block.colorEnd);
    }
    ctx.fillStyle = bodyGrad;

    // Rounded rect (scaled)
    ctx.beginPath();
    ctx.moveTo(adjX + r, adjBy - scaledBh / 2);
    ctx.lineTo(adjX + scaledBw - r, adjBy - scaledBh / 2);
    ctx.quadraticCurveTo(adjX + scaledBw, adjBy - scaledBh / 2, adjX + scaledBw, adjBy - scaledBh / 2 + r);
    ctx.lineTo(adjX + scaledBw, adjBy + scaledBh / 2 - r);
    ctx.quadraticCurveTo(adjX + scaledBw, adjBy + scaledBh / 2, adjX + scaledBw - r, adjBy + scaledBh / 2);
    ctx.lineTo(adjX + r, adjBy + scaledBh / 2);
    ctx.quadraticCurveTo(adjX, adjBy + scaledBh / 2, adjX, adjBy + scaledBh / 2 - r);
    ctx.lineTo(adjX, adjBy - scaledBh / 2 + r);
    ctx.quadraticCurveTo(adjX, adjBy - scaledBh / 2, adjX + r, adjBy - scaledBh / 2);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Highlight stripe (scaled)
    if (!block.missed) {
      const hlGrad = ctx.createLinearGradient(adjX, adjBy - scaledBh / 2, adjX + scaledBw, adjBy - scaledBh / 2);
      hlGrad.addColorStop(0, 'transparent');
      hlGrad.addColorStop(0.3, 'rgba(255,255,255,0.35)');
      hlGrad.addColorStop(0.7, 'rgba(255,255,255,0.15)');
      hlGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = hlGrad;
      ctx.beginPath();
      ctx.moveTo(adjX + r, adjBy - scaledBh / 2);
      ctx.lineTo(adjX + scaledBw - r, adjBy - scaledBh / 2);
      ctx.quadraticCurveTo(adjX + scaledBw, adjBy - scaledBh / 2, adjX + scaledBw, adjBy - scaledBh / 2 + r);
      ctx.lineTo(adjX + scaledBw, adjBy - scaledBh / 2 + r + 4);
      ctx.lineTo(adjX, adjBy - scaledBh / 2 + r + 4);
      ctx.lineTo(adjX, adjBy - scaledBh / 2 + r);
      ctx.quadraticCurveTo(adjX, adjBy - scaledBh / 2, adjX + r, adjBy - scaledBh / 2);
      ctx.closePath();
      ctx.fill();
    }

    // Thin border (scaled)
    ctx.strokeStyle = block.hit
      ? 'rgba(255,255,255,0.6)'
      : block.missed
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(adjX + r, adjBy - scaledBh / 2);
    ctx.lineTo(adjX + scaledBw - r, adjBy - scaledBh / 2);
    ctx.quadraticCurveTo(adjX + scaledBw, adjBy - scaledBh / 2, adjX + scaledBw, adjBy - scaledBh / 2 + r);
    ctx.lineTo(adjX + scaledBw, adjBy + scaledBh / 2 - r);
    ctx.quadraticCurveTo(adjX + scaledBw, adjBy + scaledBh / 2, adjX + scaledBw - r, adjBy + scaledBh / 2);
    ctx.lineTo(adjX + r, adjBy + scaledBh / 2);
    ctx.quadraticCurveTo(adjX, adjBy + scaledBh / 2, adjX, adjBy + scaledBh / 2 - r);
    ctx.lineTo(adjX, adjBy - scaledBh / 2 + r);
    ctx.quadraticCurveTo(adjX, adjBy - scaledBh / 2, adjX + r, adjBy - scaledBh / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.globalAlpha = 1;
  }

  drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    let alive = 0;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.15;
      p.life -= 0.03;
      if (p.life <= 0) continue;
      particles[alive++] = p;
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    particles.length = alive;
    ctx.globalAlpha = 1;
  }
}
