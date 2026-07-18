<template>
  <div class="dev-dashboard">
    <div class="dev-header">
      <span class="dev-title">{{ t('dev.title') }}</span>
      <button class="dev-close" aria-label="Close" @click="store.toggleDevMode()">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
          <path
            d="M18.3 5.71a1 1 0 0 0-1.41 0L12 10.59 7.11 5.7A1 1 0 0 0 5.7 7.11L10.59 12 5.7 16.89a1 1 0 1 0 1.41 1.41L12 13.41l4.89 4.89a1 1 0 0 0 1.41-1.41L13.41 12l4.89-4.89a1 1 0 0 0 0-1.4z"
          />
        </svg>
      </button>
    </div>

    <div class="dev-scroll">
      <!-- Spectrum Analyzer -->
      <section class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.spectrum') }}</h3>
        <canvas ref="spectrumCanvas" class="dev-canvas"></canvas>
      </section>

      <!-- Waveform -->
      <section class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.waveform') }}</h3>
        <canvas ref="waveformCanvas" class="dev-canvas"></canvas>
      </section>

      <!-- dB Meter -->
      <section class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.dbLevel') }}</h3>
        <div class="db-meter">
          <div class="db-bar-track">
            <div class="db-bar-fill" :style="{ width: dbPercent + '%' }" :class="dbColor"></div>
          </div>
          <div class="db-labels">
            <span class="db-value" :class="dbColor">{{ dbValue.toFixed(1) }} dB</span>
            <span class="db-peak">{{ t('dev.peak') }} {{ peakDb.toFixed(1) }} dB</span>
          </div>
        </div>
      </section>

      <!-- Live Info -->
      <section class="dev-section">
        <div class="dev-info-grid">
          <div class="dev-info-item">
            <span class="dev-info-label">{{ t('dev.bpm') }}</span>
            <span class="dev-info-value accent">{{ store.analysisData?.bpm ?? '—' }}</span>
          </div>
          <div class="dev-info-item">
            <span class="dev-info-label">{{ t('dev.elapsed') }}</span>
            <span class="dev-info-value">{{ formatTime(store.devMetrics?.elapsed ?? 0) }}</span>
          </div>
          <div class="dev-info-item">
            <span class="dev-info-label">{{ t('dev.combo') }}</span>
            <span class="dev-info-value">{{ store.devMetrics?.combo ?? 0 }}</span>
          </div>
          <div class="dev-info-item">
            <span class="dev-info-label">{{ t('dev.accuracy') }}</span>
            <span class="dev-info-value" :class="accuracyColor">
              {{ ((store.devMetrics?.accuracy ?? 0) * 100).toFixed(1) }}%
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const { t } = useI18n();

const spectrumCanvas = ref<HTMLCanvasElement | null>(null);
const waveformCanvas = ref<HTMLCanvasElement | null>(null);

const dbValue = ref(-60);
const peakDb = ref(-60);
const dbPercent = ref(0);

let animId = 0;
let peakDecay = 0;

const dbColor = computed(() => {
  if (dbValue.value > -6) return 'db-red';
  if (dbValue.value > -18) return 'db-yellow';
  return 'db-green';
});

const accuracyColor = computed(() => {
  const acc = store.devMetrics?.accuracy ?? 0;
  if (acc >= 0.95) return 'acc-perfect';
  if (acc >= 0.8) return 'acc-good';
  return 'acc-warn';
});

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

function draw(): void {
  const analyser = store.getAnalyser();
  if (!analyser) {
    animId = requestAnimationFrame(draw);
    return;
  }

  drawSpectrum(analyser);
  drawWaveform(analyser);
  updateDb(analyser);

  animId = requestAnimationFrame(draw);
}

function drawSpectrum(analyser: AnalyserNode): void {
  const canvas = spectrumCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const bufferLength = analyser.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteFrequencyData(dataArray);

  ctx.clearRect(0, 0, w, h);

  // Draw frequency bars
  const barCount = 64;
  const step = Math.floor(bufferLength / barCount);
  const barWidth = (w - (barCount - 1) * 1.5) / barCount;

  for (let i = 0; i < barCount; i++) {
    // Average the frequency bin range for this bar
    let sum = 0;
    for (let j = 0; j < step; j++) {
      sum += dataArray[i * step + j];
    }
    const avg = sum / step;
    const barHeight = (avg / 255) * h * 0.95;

    const x = i * (barWidth + 1.5);
    const y = h - barHeight;

    // Gradient color based on level
    const ratio = avg / 255;
    const r = Math.round(167 + ratio * 88);
    const g = Math.round(139 - ratio * 80);
    const b = Math.round(250 - ratio * 100);

    ctx.fillStyle = `rgb(${String(r)},${String(g)},${String(b)})`;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Subtle top cap
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillRect(x, y, barWidth, 2);
  }
}

function drawWaveform(analyser: AnalyserNode): void {
  const canvas = waveformCanvas.value;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== w * dpr) {
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  const bufferLength = analyser.fftSize;
  const dataArray = new Uint8Array(bufferLength);
  analyser.getByteTimeDomainData(dataArray);

  ctx.clearRect(0, 0, w, h);

  // Center line
  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, h / 2);
  ctx.lineTo(w, h / 2);
  ctx.stroke();

  // Waveform
  ctx.strokeStyle = 'rgba(167, 139, 250, 0.8)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  const sliceWidth = w / bufferLength;
  let x = 0;
  for (let i = 0; i < bufferLength; i++) {
    const v = dataArray[i] / 128.0;
    const y = (v * h) / 2;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
    x += sliceWidth;
  }
  ctx.lineTo(w, h / 2);
  ctx.stroke();
}

function updateDb(analyser: AnalyserNode): void {
  const dataArray = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(dataArray);

  // RMS calculation
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    sum += dataArray[i] * dataArray[i];
  }
  const rms = Math.sqrt(sum / dataArray.length);
  const db = rms > 0 ? 20 * Math.log10(rms) : -60;

  dbValue.value = Math.max(-60, Math.min(0, db));
  dbPercent.value = Math.max(0, Math.min(100, ((dbValue.value + 60) / 60) * 100));

  // Peak with decay
  if (dbValue.value > peakDb.value) {
    peakDb.value = dbValue.value;
    peakDecay = 0;
  } else {
    peakDecay++;
    if (peakDecay > 30) {
      peakDb.value = Math.max(-60, peakDb.value - 0.5);
    }
  }
}

onMounted(() => {
  animId = requestAnimationFrame(draw);
});

onUnmounted(() => {
  cancelAnimationFrame(animId);
});
</script>
