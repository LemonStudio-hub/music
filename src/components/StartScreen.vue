<template>
  <div class="start-screen">
    <h1>MUSIC BLOCKS</h1>
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
    <div class="file-name">
      <template v-if="store.loading">加载中: {{ store.fileName }}...</template>
      <template v-else-if="store.errorMsg">{{ store.errorMsg }}</template>
      <template v-else>{{ store.fileName }}</template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useGameStore } from '../stores/game';

const store = useGameStore();
const dragover = ref(false);

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
