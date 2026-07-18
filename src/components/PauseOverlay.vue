<template>
  <div class="pause-overlay show" role="dialog" aria-modal="true" :aria-label="t('pause.title')">
    <p>{{ t('pause.title') }}</p>
    <div class="pause-actions">
      <button class="btn-primary" @click="store.resume()">{{ t('pause.resume') }}</button>
      <button class="btn-secondary" @click="store.restart()">{{ t('pause.restart') }}</button>
      <button class="btn-ghost" @click="store.quit()">{{ t('pause.quit') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const { t } = useI18n();
</script>
