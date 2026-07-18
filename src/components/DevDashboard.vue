<template>
  <div class="dev-dashboard">
    <div class="dev-header">
      <span class="dev-title">{{ t('dev.title') }}</span>
      <button class="dev-close" @click="store.toggleDevMode()">✕</button>
    </div>

    <div class="dev-scroll">
      <!-- Audio Analysis -->
      <section v-if="store.analysisData" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.audio') }}</h3>
        <div class="dev-grid">
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.bpm') }}</span>
            <span class="dev-stat-value accent">{{ store.analysisData.bpm }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.duration') }}</span>
            <span class="dev-stat-value">{{ formatTime(store.analysisData.duration) }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.noteCount') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.noteCount }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.notesPerSecond') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.notesPerSecond.toFixed(1) }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.peakNps') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.peakNotesPerSecond }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.avgIntensity') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.avgIntensity.toFixed(3) }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.maxIntensity') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.maxIntensity.toFixed(3) }}</span>
          </div>
        </div>
      </section>

      <!-- Lane Distribution -->
      <section v-if="store.analysisData" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.laneDistribution') }}</h3>
        <div class="dev-bars">
          <div
            v-for="(count, i) in store.analysisData.laneDistribution"
            :key="i"
            class="dev-bar-row"
          >
            <span class="dev-bar-label">L{{ i }}</span>
            <div class="dev-bar-track">
              <div class="dev-bar-fill" :style="{ width: lanePercent(count) + '%' }"></div>
            </div>
            <span class="dev-bar-value">{{ count }}</span>
          </div>
        </div>
      </section>

      <!-- Beat Grid -->
      <section v-if="store.analysisData" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.beatGrid') }}</h3>
        <div class="dev-grid">
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.gridCount') }}</span>
            <span class="dev-stat-value">{{ store.analysisData.beatGrid.length }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.gridInterval') }}</span>
            <span class="dev-stat-value">
              {{ store.analysisData.bpm > 0 ? (60 / store.analysisData.bpm).toFixed(3) : '—' }}s
            </span>
          </div>
        </div>
      </section>

      <!-- Sections -->
      <section
        v-if="store.analysisData && store.analysisData.sections.length > 0"
        class="dev-section"
      >
        <h3 class="dev-section-title">{{ t('dev.sections') }}</h3>
        <div class="dev-sections-list">
          <div v-for="(sec, i) in store.analysisData.sections" :key="i" class="dev-section-item">
            <span class="dev-section-type" :class="'sec-' + sec.type">
              {{ t(`dev.${sec.type}`) }}
            </span>
            <span class="dev-section-time">
              {{ formatTime(sec.startTime) }} – {{ formatTime(sec.endTime) }}
            </span>
            <span class="dev-section-intensity">
              {{ sec.intensity.toFixed(2) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Realtime Data -->
      <section v-if="store.devMetrics" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.realtime') }}</h3>
        <div class="dev-grid">
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.elapsed') }}</span>
            <span class="dev-stat-value">{{ formatTime(store.devMetrics.elapsed) }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.accuracy') }}</span>
            <span class="dev-stat-value" :class="accuracyColor">
              {{ (store.devMetrics.accuracy * 100).toFixed(1) }}%
            </span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.currentNps') }}</span>
            <span class="dev-stat-value">{{ store.devMetrics.currentNps.toFixed(1) }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.activeBlocks') }}</span>
            <span class="dev-stat-value">{{ store.devMetrics.activeBlocks }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.approaching') }}</span>
            <span class="dev-stat-value" :class="{ warn: store.devMetrics.approachingBlocks > 3 }">
              {{ store.devMetrics.approachingBlocks }}
            </span>
          </div>
        </div>
      </section>

      <!-- Live Stats -->
      <section v-if="store.devMetrics" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.liveStats') }}</h3>
        <div class="dev-grid">
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.score') }}</span>
            <span class="dev-stat-value accent">{{ store.devMetrics.score }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.combo') }}</span>
            <span class="dev-stat-value">{{ store.devMetrics.combo }}</span>
          </div>
          <div class="dev-stat">
            <span class="dev-stat-label">{{ t('dev.maxCombo') }}</span>
            <span class="dev-stat-value">{{ store.devMetrics.maxCombo }}</span>
          </div>
        </div>
      </section>

      <!-- Hit Breakdown -->
      <section v-if="store.devMetrics" class="dev-section">
        <h3 class="dev-section-title">{{ t('dev.hitBreakdown') }}</h3>
        <div class="dev-hit-grid">
          <div class="dev-hit-item perfect">
            <span class="dev-hit-label">{{ t('results.perfect') }}</span>
            <span class="dev-hit-value">{{ store.devMetrics.perfect }}</span>
          </div>
          <div class="dev-hit-item great">
            <span class="dev-hit-label">{{ t('results.great') }}</span>
            <span class="dev-hit-value">{{ store.devMetrics.great }}</span>
          </div>
          <div class="dev-hit-item good">
            <span class="dev-hit-label">{{ t('results.good') }}</span>
            <span class="dev-hit-value">{{ store.devMetrics.good }}</span>
          </div>
          <div class="dev-hit-item miss">
            <span class="dev-hit-label">{{ t('results.miss') }}</span>
            <span class="dev-hit-value">{{ store.devMetrics.miss }}</span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const { t } = useI18n();

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m)}:${String(s).padStart(2, '0')}`;
}

function lanePercent(count: number): number {
  if (!store.analysisData) return 0;
  const max = Math.max(...store.analysisData.laneDistribution, 1);
  return (count / max) * 100;
}

const accuracyColor = computed(() => {
  if (!store.devMetrics) return '';
  const acc = store.devMetrics.accuracy;
  if (acc >= 0.95) return 'acc-perfect';
  if (acc >= 0.8) return 'acc-good';
  return 'acc-warn';
});
</script>
