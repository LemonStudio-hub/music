<template>
  <div class="start-screen">
    <h1>MUSIC BLOCKS</h1>

    <div class="difficulty-selector">
      <button
        v-for="d in difficulties"
        :key="d.value"
        class="diff-btn"
        :class="{ active: store.difficulty === d.value }"
        @click="store.setDifficulty(d.value)"
      >
        {{ d.label }}
      </button>
    </div>

    <div
      class="drop-zone"
      :class="{ dragover }"
      @dragover.prevent="dragover = true"
      @dragleave="dragover = false"
      @drop.prevent="onDrop"
    >
      <svg viewBox="0 0 24 24">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <span>拖放 MP3 或点击选择</span>
      <input
        type="file"
        class="file-input"
        accept="audio/mpeg,audio/mp3,audio/*"
        @change="onFileChange"
      />
    </div>

    <div v-if="store.hasStored && !store.loading" class="cached-section">
      <button class="cached-btn" :disabled="store.restoring" @click="store.restoreStored()">
        {{ store.restoring ? '恢复中...' : '继续上次的歌曲' }}
      </button>
      <button class="cached-clear" @click="store.clearStored()">清除缓存</button>
    </div>

    <div class="file-name">
      <template v-if="store.loading">分析中: {{ store.fileName }}...</template>
      <template v-else-if="store.restoring">恢复中: {{ store.fileName }}...</template>
      <template v-else-if="store.errorMsg">{{ store.errorMsg }}</template>
      <template v-else>{{ store.fileName }}</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useGameStore, type Difficulty } from '@/stores/game';

const store = useGameStore();
const dragover = ref(false);

const difficulties: Array<{ value: Difficulty; label: string }> = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' },
];

onMounted(() => {
  void store.checkStored();
});

function onDrop(e: DragEvent): void {
  dragover.value = false;
  const files = e.dataTransfer?.files;
  if (files?.[0]) void store.loadFile(files[0]);
}

function onFileChange(e: Event): void {
  const target = e.target as HTMLInputElement;
  const files = target.files;
  if (files?.[0]) void store.loadFile(files[0]);
}
</script>
