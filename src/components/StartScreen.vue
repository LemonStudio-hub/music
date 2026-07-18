<template>
  <div class="start-screen">
    <h1>{{ t('title') }}</h1>

    <div class="difficulty-selector" role="radiogroup" :aria-label="t('title')">
      <button
        v-for="d in difficulties"
        :key="d.value"
        class="diff-btn"
        :class="{ active: store.difficulty === d.value }"
        :aria-pressed="store.difficulty === d.value"
        @click="store.setDifficulty(d.value)"
      >
        {{ t(`difficulty.${d.value}`) }}
      </button>
    </div>

    <div
      class="drop-zone"
      :class="{ dragover }"
      role="button"
      :aria-label="t('start.dropHint')"
      @dragover.prevent="dragover = true"
      @dragleave="dragover = false"
      @drop.prevent="onDrop"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
        />
      </svg>
      <span>{{ t('start.dropHint') }}</span>
      <input
        type="file"
        class="file-input"
        accept="audio/mpeg,audio/mp3,audio/*"
        :aria-label="t('start.dropHint')"
        @change="onFileChange"
      />
    </div>

    <div v-if="store.hasStored && !store.loading" class="cached-section">
      <button class="cached-btn" :disabled="store.restoring" @click="store.restoreStored()">
        {{ store.restoring ? t('start.restoring') : t('start.restore') }}
      </button>
      <button class="cached-clear" @click="store.clearStored()">{{ t('start.clearCache') }}</button>
    </div>

    <div
      v-if="store.loading || store.restoring"
      class="load-progress"
      role="progressbar"
      :aria-valuenow="store.loadPercent"
      aria-valuemin="0"
      aria-valuemax="100"
    >
      <div class="load-progress-label">
        {{ t(`start.${store.loadPhase || 'reading'}`) }}
        <span class="load-progress-pct">{{ store.loadPercent }}%</span>
      </div>
      <div class="load-progress-track">
        <div class="load-progress-fill" :style="{ width: store.loadPercent + '%' }"></div>
      </div>
    </div>

    <div v-else class="file-name">
      <template v-if="store.errorMsg">{{ store.errorMsg }}</template>
      <template v-else>{{ store.fileName }}</template>
    </div>

    <button class="settings-btn" :aria-label="t('settings.title')" @click="showSettings = true">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path
          d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.48.48 0 0 0-.48-.41h-3.84a.48.48 0 0 0-.48.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96a.49.49 0 0 0-.59.22L2.74 8.87a.48.48 0 0 0 .12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.26.41.48.41h3.84c.24 0 .44-.17.48-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6A3.6 3.6 0 1 1 12 8.4a3.6 3.6 0 0 1 0 7.2z"
        />
      </svg>
    </button>

    <SettingsPanel v-if="showSettings" @close="showSettings = false" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore, type Difficulty } from '@/stores/game';
import SettingsPanel from './SettingsPanel.vue';

const store = useGameStore();
const { t, locale } = useI18n();
const dragover = ref(false);
const showSettings = ref(false);

const difficulties: Array<{ value: Difficulty }> = [
  { value: 'easy' },
  { value: 'normal' },
  { value: 'hard' },
];

// Update html lang attribute when locale changes
watch(
  locale,
  lang => {
    document.documentElement.lang = lang;
  },
  { immediate: true },
);

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
