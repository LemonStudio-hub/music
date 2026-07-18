<template>
  <div class="settings-overlay" @click.self="$emit('close')">
    <div class="settings-panel" role="dialog" aria-modal="true" :aria-label="t('settings.title')">
      <div class="settings-header">
        <span>{{ t('settings.title') }}</span>
        <button class="settings-close" aria-label="Close" @click="$emit('close')">✕</button>
      </div>

      <div class="settings-body">
        <!-- Language -->
        <div class="settings-row">
          <span class="settings-label">{{ t('settings.language') }}</span>
          <div class="settings-toggle-group">
            <button
              class="settings-toggle"
              :class="{ active: locale === 'zh' }"
              @click="setLang('zh')"
            >
              中文
            </button>
            <button
              class="settings-toggle"
              :class="{ active: locale === 'en' }"
              @click="setLang('en')"
            >
              EN
            </button>
          </div>
        </div>

        <!-- Dev Mode -->
        <div v-if="canDev" class="settings-row">
          <span class="settings-label">{{ t('settings.devMode') }}</span>
          <button
            class="settings-switch"
            :class="{ on: store.devMode }"
            role="switch"
            :aria-checked="store.devMode"
            @click="store.toggleDevMode()"
          >
            <span class="settings-switch-thumb"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useGameStore } from '@/stores/game';
import { setLocale } from '@/i18n';

defineEmits<{ close: [] }>();

const store = useGameStore();
const { t, locale } = useI18n();

const canDev = computed(() => window.innerWidth >= 768);

function setLang(lang: 'zh' | 'en'): void {
  setLocale(lang);
  document.documentElement.lang = lang;
}
</script>
