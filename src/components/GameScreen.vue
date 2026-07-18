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
        @click="store.toggleDevMode()"
      >
        ⚙
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
import PauseOverlay from './PauseOverlay.vue';
import DevDashboard from './DevDashboard.vue';

const store = useGameStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

const scorePulse = ref(false);
const comboPulse = ref(false);

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
  if (store.combo > prevCombo) triggerComboPulse();
}

function onPointerDown(e: PointerEvent): void {
  processHit(store.hitPointer(e));
}

function onTouchLane(lane: number): void {
  processHit(store.hitLane(lane));
}

const keyLaneMap: Record<string, number> = { KeyD: 0, KeyF: 1, KeyJ: 2, KeyK: 3 };

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space') {
    e.preventDefault();
    const result = store.hitAll();
    if (result) playHitSound(result.block.lane);
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
    processHit(store.hitLane(lane));
  }
}

onMounted(() => {
  if (canvasRef.value) {
    store.initRenderer(canvasRef.value);
  }
  document.addEventListener('keydown', onKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown);
});
</script>
