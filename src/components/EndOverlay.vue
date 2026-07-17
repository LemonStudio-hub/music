<template>
  <div class="pause-overlay show">
    <p>演奏结束</p>
    <div class="end-stats">
      <span>得分: {{ store.score }}</span>
      <span>最高连击: {{ store.maxCombo }}</span>
    </div>
    <button @click="store.reset()">返回</button>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game';

const store = useGameStore();
</script>
