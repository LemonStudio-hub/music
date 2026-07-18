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

    <button
      class="lang-toggle"
      :aria-label="locale === 'zh' ? 'Switch to English' : '切换到中文'"
      @click="toggleLocale"
    >
      {{ locale === 'zh' ? 'EN' : '中文' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
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
