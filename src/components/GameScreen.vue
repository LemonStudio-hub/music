<template>
  <div class="game-screen" :class="{ 'dev-split': store.devMode }">
    <div class="game-area">
      <canvas
        ref="canvasRef"
        role="img"
        aria-label="Music blocks game"
        @pointerdown="onPointerDown"
      ></canvas>
      <div class="score" :class="{ pulse: scorePulse }">{{ store.scoreText }}</div>
      <div class="combo" :class="{ pulse: comboPulse }">{{ store.comboText }}</div>
      <div class="time-remaining">{{ formatTime(store.timeRemaining) }}</div>
      <div
        class="progress-bar"
        role="progressbar"
        :aria-valuenow="Math.round(store.progress * 100)"
        aria-valuemin="0"
        aria-valuemax="100"
        :style="{ width: store.progressPercent }"
      ></div>
      <div class="song-info">
        <span class="song-name">{{ store.fileName }}</span>
        <span class="song-diff">{{ store.difficulty }}</span>
      </div>
      <button
        v-if="!store.devMode"
        class="pause-btn"
        aria-label="Pause game"
        @click="store.togglePause()"
      >
        II
      </button>
      <button
        v-if="store.canEnableDevMode()"
        class="dev-toggle-btn"
        :class="{ active: store.devMode }"
        aria-label="Toggle developer mode"
        @click="store.toggleDevMode()"
      >
        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
          <path
            d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
          />
        </svg>
      </button>

      <div class="touch-zones">
        <div
          v-for="lane in 4"
          :key="lane"
          class="touch-zone"
          :data-lane="lane - 1"
          @pointerdown.prevent="onTouchLane(lane - 1)"
        ></div>
      </div>

      <HitEffect
        v-for="effect in effects"
        :key="effect.id"
        :text="effect.text"
        :color="effect.color"
        :x="effect.x"
        :y="effect.y"
      />

      <ComboMilestone v-if="comboMilestone" :key="comboMilestone" :value="comboMilestone" />

      <PauseOverlay v-if="store.screen === 'paused'" />
    </div>

    <DevDashboard v-if="store.devMode" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useGameStore } from '@/stores/game';
import { Block } from '@/renderer';
import { playHitSound } from '@/sfx';
import HitEffect from './HitEffect.vue';
import ComboMilestone from './ComboMilestone.vue';
import PauseOverlay from './PauseOverlay.vue';
import DevDashboard from './DevDashboard.vue';

const store = useGameStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

const scorePulse = ref(false);
const comboPulse = ref(false);
const comboMilestone = ref(0);

interface Effect {
  id: number;
  text: string;
  color: string;
  x: number;
  y: number;
}

const effects = ref<Effect[]>([]);
let effectId = 0;
let scorePulseTimer = 0;
let comboPulseTimer = 0;
let milestoneTimer = 0;

const MILESTONES = [10, 25, 50, 75, 100, 150, 200, 300, 500];

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

function triggerScorePulse(): void {
  scorePulse.value = true;
  clearTimeout(scorePulseTimer);
  scorePulseTimer = window.setTimeout(() => {
    scorePulse.value = false;
  }, 100);
}

function triggerComboPulse(): void {
  comboPulse.value = true;
  clearTimeout(comboPulseTimer);
  comboPulseTimer = window.setTimeout(() => {
    comboPulse.value = false;
  }, 120);
}

function triggerComboMilestone(value: number): void {
  comboMilestone.value = value;
  clearTimeout(milestoneTimer);
  milestoneTimer = window.setTimeout(() => {
    comboMilestone.value = 0;
  }, 1500);
}

function showHitEffect(block: Block, text: string, color: string): void {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const w = canvas.width / (window.devicePixelRatio || 1);
  const h = canvas.height / (window.devicePixelRatio || 1);
  const isMobile = matchMedia('(hover: none) and (pointer: coarse)').matches;
  const hitLineY = isMobile ? h - 140 : h - 100;
  const laneWidth = w / 4;

  const id = ++effectId;
  const x = block.lane * laneWidth + laneWidth / 2;
  const y = hitLineY - 30;
  effects.value.push({ id, text, color, x, y });
  setTimeout(() => {
    effects.value = effects.value.filter(e => e.id !== id);
  }, 700);
}

function processHit(result: { block: Block; dist: number } | null): void {
  if (!result) return;
  const label = store.getHitLabel(result.dist);
  showHitEffect(result.block, label.text, label.color);
  playHitSound(result.block.lane);
  store.recordHit(label.text);
  const prevCombo = store.combo;
  store.processHit(result);
  triggerScorePulse();
  if (store.combo > prevCombo) {
    triggerComboPulse();
    // Check combo milestones
    for (const m of MILESTONES) {
      if (prevCombo < m && store.combo >= m) {
        triggerComboMilestone(m);
        break;
      }
    }
  }
}

function onPointerDown(e: PointerEvent): void {
  processHit(store.hitPointer(e));
}

function onTouchLane(lane: number): void {
  store.pressLane(lane);
  processHit(store.hitLane(lane));
}

const keyLaneMap: Record<string, number> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    const result = store.hitAll();
    if (result) {
      playHitSound(result.block.lane);
      store.pressLane(result.block.lane);
    }
    processHit(result);
    return;
  }
  if (e.code === 'Escape') {
    store.togglePause();
    return;
  }
  if (e.code in keyLaneMap) {
    const lane = keyLaneMap[e.code];
    e.preventDefault();
    playHitSound(lane);
    store.pressLane(lane);
    processHit(store.hitLane(lane));
  }
}

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (canvasRef.value) {
    store.initRenderer(canvasRef.value);
    const parent = canvasRef.value.parentElement;
    if (parent) {
      resizeObserver = new ResizeObserver(() => {
        store.requestResize();
      });
      resizeObserver.observe(parent);
    }
  }
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  document.removeEventListener('keydown', onKeyDown);
});
</script>
