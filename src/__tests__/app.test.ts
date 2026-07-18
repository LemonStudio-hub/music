import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import zh from '@/locales/zh';
import App from '@/App.vue';
import StartScreen from '@/components/StartScreen.vue';
import GameScreen from '@/components/GameScreen.vue';

function createI18nInstance(): ReturnType<typeof createI18n> {
  return createI18n({
    legacy: false,
    locale: 'zh',
    fallbackLocale: 'en',
    messages: { zh, en: zh },
  });
}

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render StartScreen when screen is start', () => {
    const wrapper = mount(App, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.findComponent(StartScreen).exists()).toBe(true);
    expect(wrapper.findComponent(GameScreen).exists()).toBe(false);
  });

  it('should render GameScreen when screen is not start', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.screen = 'playing';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
    expect(wrapper.findComponent(StartScreen).exists()).toBe(false);
  });

  it('should render GameScreen when paused', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.screen = 'paused';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
  });

  it('should render GameScreen when ended', async () => {
    const wrapper = mount(App, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.screen = 'results';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
  });
});
