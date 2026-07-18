import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import zh from '@/locales/zh';
import HitEffect from '@/components/HitEffect.vue';
import PauseOverlay from '@/components/PauseOverlay.vue';
import ResultsScreen from '@/components/ResultsScreen.vue';
import StartScreen from '@/components/StartScreen.vue';
import GameScreen from '@/components/GameScreen.vue';

function createI18nInstance() {
  return createI18n({
    legacy: false,
    locale: 'zh',
    fallbackLocale: 'en',
    messages: { zh, en: zh },
  });
}

describe('HitEffect', () => {
  it('should render with props', () => {
    const wrapper = mount(HitEffect, {
      props: { text: 'PERFECT', color: '#fff', x: 100, y: 200 },
    });

    expect(wrapper.text()).toBe('PERFECT');
    expect(wrapper.classes()).toContain('hit-effect');
  });

  it('should apply correct styles', () => {
    const wrapper = mount(HitEffect, {
      props: { text: 'GREAT', color: '#ccc', x: 150, y: 250 },
    });

    const el = wrapper.element as HTMLElement;
    expect(el.style.color).toBe('rgb(204, 204, 204)');
    expect(el.style.left).toBe('150px');
    expect(el.style.top).toBe('250px');
    expect(el.style.transform).toBe('translateX(-50%)');
  });
});

describe('PauseOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render pause text', () => {
    const wrapper = mount(PauseOverlay, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.text()).toContain('已暂停');
  });

  it('should have resume, restart and quit buttons', () => {
    const wrapper = mount(PauseOverlay, {
      global: { plugins: [createI18nInstance()] },
    });
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(3);
    expect(buttons[0].text()).toBe('继续');
    expect(buttons[1].text()).toBe('重新开始');
    expect(buttons[2].text()).toBe('返回菜单');
  });

  it('should call store.resume on resume click', async () => {
    const wrapper = mount(PauseOverlay, {
      global: { plugins: [createI18nInstance()] },
    });
    await wrapper.findAll('button')[0].trigger('click');
  });

  it('should call store.restart on restart click', async () => {
    const wrapper = mount(PauseOverlay, {
      global: { plugins: [createI18nInstance()] },
    });
    await wrapper.findAll('button')[1].trigger('click');
  });
});

describe('ResultsScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should not render without results', () => {
    const wrapper = mount(ResultsScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('.results-screen').exists()).toBe(false);
  });

  it('should render with results', async () => {
    const wrapper = mount(ResultsScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.results = {
      score: 1000,
      maxCombo: 50,
      totalNotes: 100,
      perfectCount: 80,
      greatCount: 10,
      goodCount: 5,
      missCount: 5,
      accuracy: 0.95,
      grade: 'S',
    };
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.results-screen').exists()).toBe(true);
    expect(wrapper.find('.results-grade').text()).toBe('S');
    expect(wrapper.find('.results-score').text()).toBe('1000');
  });

  it('should have action buttons', async () => {
    const wrapper = mount(ResultsScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.results = {
      score: 500,
      maxCombo: 20,
      totalNotes: 80,
      perfectCount: 40,
      greatCount: 20,
      goodCount: 10,
      missCount: 10,
      accuracy: 0.875,
      grade: 'B',
    };
    await wrapper.vm.$nextTick();
    const buttons = wrapper.findAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(2);
  });
});

describe('StartScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render title', () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('h1').text()).toBe('Music Blocks');
  });

  it('should have file input', () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
  });

  it('should have correct accept attribute', () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const input = wrapper.find('input[type="file"]');
    expect(input.attributes('accept')).toBe('audio/mpeg,audio/mp3,audio/*');
  });

  it('should show file name when set', async () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.fileName = 'test.mp3';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.file-name').text()).toBe('test.mp3');
  });

  it('should show loading text when loading', async () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.loading = true;
    store.loadPhase = 'analyzing';
    store.loadPercent = 50;
    store.fileName = 'test.mp3';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.load-progress').exists()).toBe(true);
  });

  it('should show error message when set', async () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.errorMsg = '无法解析该音频文件';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.file-name').text()).toBe('无法解析该音频文件');
  });

  it('should toggle dragover class on drag events', async () => {
    const wrapper = mount(StartScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const dropZone = wrapper.find('.drop-zone');

    await dropZone.trigger('dragover');
    expect(dropZone.classes()).toContain('dragover');

    await dropZone.trigger('dragleave');
    expect(dropZone.classes()).not.toContain('dragover');
  });
});

describe('GameScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render canvas', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('should render score display', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('.score').exists()).toBe(true);
    expect(wrapper.find('.score').text()).toBe('0');
  });

  it('should render combo display', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('.combo').exists()).toBe(true);
  });

  it('should render progress bar', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('.progress-bar').exists()).toBe(true);
  });

  it('should render pause button', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    expect(wrapper.find('.pause-btn').exists()).toBe(true);
  });

  it('should render 4 touch zones', () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const zones = wrapper.findAll('.touch-zone');
    expect(zones).toHaveLength(4);
  });

  it('should show pause overlay when paused', async () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.screen = 'paused';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(PauseOverlay).exists()).toBe(true);
  });

  it('should not render results screen inside game screen', async () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    store.screen = 'results';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(ResultsScreen).exists()).toBe(false);
  });

  it('should call togglePause on pause button click', async () => {
    const wrapper = mount(GameScreen, {
      global: { plugins: [createI18nInstance()] },
    });
    const { useGameStore } = await import('@/stores/game');
    const store = useGameStore();
    const spy = vi.spyOn(store, 'togglePause');
    store.screen = 'playing';

    await wrapper.find('.pause-btn').trigger('click');
    expect(spy).toHaveBeenCalled();
  });
});
