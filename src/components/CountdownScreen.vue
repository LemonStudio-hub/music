<template>
  <div class="countdown-screen">
    <div :key="store.countdownValue" class="countdown-number">{{ store.countdownValue }}</div>
    <div class="countdown-hint">准备</div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';

const store = useGameStore();
</script>
