<template>
  <div v-if="store.results" class="results-screen">
    <div class="results-grade" :class="'grade-' + store.results.grade">
      {{ store.results.grade }}
    </div>
    <div class="results-score">{{ store.results.score }}</div>
    <div class="results-song">{{ store.fileName }}</div>

    <div class="results-grid">
      <div class="results-item">
        <span class="results-label">准确率</span>
        <span class="results-value">{{ (store.results.accuracy * 100).toFixed(1) }}%</span>
      </div>
      <div class="results-item">
        <span class="results-label">最高连击</span>
        <span class="results-value">{{ store.results.maxCombo }}</span>
      </div>
      <div class="results-item perfect">
        <span class="results-label">PERFECT</span>
        <span class="results-value">{{ store.results.perfectCount }}</span>
      </div>
      <div class="results-item great">
        <span class="results-label">GREAT</span>
        <span class="results-value">{{ store.results.greatCount }}</span>
      </div>
      <div class="results-item good">
        <span class="results-label">GOOD</span>
        <span class="results-value">{{ store.results.goodCount }}</span>
      </div>
      <div class="results-item miss">
        <span class="results-label">MISS</span>
        <span class="results-value">{{ store.results.missCount }}</span>
      </div>
    </div>

    <div class="results-actions">
      <button class="btn-primary" @click="store.restart()">再来一次</button>
      <button class="btn-secondary" @click="store.quit()">返回菜单</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';

const store = useGameStore();
</script>
