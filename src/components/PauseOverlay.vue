<template>
  <div class="pause-overlay show">
    <p>PAUSED</p>
    <button @click="store.resume()">继续</button>
    <button @click="store.restart()">重新开始</button>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '../stores/game';

const store = useGameStore();
</script>
