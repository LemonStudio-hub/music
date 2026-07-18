<template>
  <div class="start-screen">
    <h1>{{ t('title') }}</h1>

    <div class="difficulty-selector">
      <button
        v-for="d in difficulties"
        :key="d.value"
        class="diff-btn"
        :class="{ active: store.difficulty === d.value }"
        @click="store.setDifficulty(d.value)"
      >
        {{ t(`difficulty.${d.value}`) }}
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
      <span>{{ t('start.dropHint') }}</span>
      <input
        type="file"
        class="file-input"
        accept="audio/mpeg,audio/mp3,audio/*"
        @change="onFileChange"
      />
    </div>

    <div v-if="store.hasStored && !store.loading" class="cached-section">
      <button class="cached-btn" :disabled="store.restoring" @click="store.restoreStored()">
        {{ store.restoring ? t('start.restoring') : t('start.restore') }}
      </button>
      <button class="cached-clear" @click="store.clearStored()">{{ t('start.clearCache') }}</button>
    </div>

    <div class="file-name">
      <template v-if="store.loading">{{ t('start.analyzing', { file: store.fileName }) }}</template>
      <template v-else-if="store.restoring">
        {{ t('start.restoringFile', { file: store.fileName }) }}
      </template>
      <template v-else-if="store.errorMsg">{{ store.errorMsg }}</template>
      <template v-else>{{ store.fileName }}</template>
    </div>

    <button class="lang-toggle" @click="toggleLocale">
      {{ locale === 'zh' ? 'EN' : '中文' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore, type Difficulty } from '@/stores/game';
import { setLocale } from '@/i18n';

const store = useGameStore();
const { t, locale } = useI18n();
const dragover = ref(false);

const difficulties: Array<{ value: Difficulty }> = [
  { value: 'easy' },
  { value: 'normal' },
  { value: 'hard' },
];

function toggleLocale(): void {
  setLocale(locale.value === 'zh' ? 'en' : 'zh');
}

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
