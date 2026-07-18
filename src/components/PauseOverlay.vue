<template>
  <div class="pause-overlay show">
    <p>已暂停</p>
    <div class="pause-actions">
      <button class="btn-primary" @click="store.resume()">继续</button>
      <button class="btn-secondary" @click="store.restart()">重新开始</button>
      <button class="btn-ghost" @click="store.quit()">返回菜单</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useGameStore } from '@/stores/game';

const store = useGameStore();
</script>
