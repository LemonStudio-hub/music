import { mount } from '@vue/test-utils';
import { createI18n } from 'vue-i18n';
import { createPinia, setActivePinia } from 'pinia';
import zh from '@/locales/zh';
import type { Component } from 'vue';

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  fallbackLocale: 'en',
  messages: { zh, en: zh },
});

export function mountWithPlugins(component: Component, options: Record<string, unknown> = {}) {
  const pinia = createPinia();
  setActivePinia(pinia);
  return mount(component, {
    ...options,
    global: {
      plugins: [pinia, i18n],
      ...(options.global as Record<string, unknown>),
    },
  });
}
