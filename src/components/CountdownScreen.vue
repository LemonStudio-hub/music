<template>
  <div class="countdown-screen">
    <div :key="store.countdownValue" class="countdown-number">{{ store.countdownValue }}</div>
    <div class="countdown-hint">{{ t('countdown.ready') }}</div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';

const store = useGameStore();
const { t } = useI18n();
</script>
