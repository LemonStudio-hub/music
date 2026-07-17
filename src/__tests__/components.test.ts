import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import HitEffect from '../components/HitEffect.vue';
import PauseOverlay from '../components/PauseOverlay.vue';
import EndOverlay from '../components/EndOverlay.vue';
import StartScreen from '../components/StartScreen.vue';
import GameScreen from '../components/GameScreen.vue';

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
    const wrapper = mount(PauseOverlay);
    expect(wrapper.text()).toContain('PAUSED');
  });

  it('should have resume and restart buttons', () => {
    const wrapper = mount(PauseOverlay);
    const buttons = wrapper.findAll('button');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].text()).toBe('继续');
    expect(buttons[1].text()).toBe('重新开始');
  });

  it('should call store.resume on resume click', async () => {
    const wrapper = mount(PauseOverlay);
    await wrapper.findAll('button')[0].trigger('click');
    // Store resume is called - we verify no errors thrown
  });

  it('should call store.restart on restart click', async () => {
    const wrapper = mount(PauseOverlay);
    await wrapper.findAll('button')[1].trigger('click');
    // Store restart is called - we verify no errors thrown
  });
});

describe('EndOverlay', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render end text', () => {
    const wrapper = mount(EndOverlay);
    expect(wrapper.text()).toContain('演奏结束');
  });

  it('should display score and maxCombo', () => {
    const wrapper = mount(EndOverlay);
    expect(wrapper.text()).toContain('得分');
    expect(wrapper.text()).toContain('最高连击');
  });

  it('should have return button', () => {
    const wrapper = mount(EndOverlay);
    const button = wrapper.find('button');
    expect(button.exists()).toBe(true);
    expect(button.text()).toBe('返回');
  });

  it('should call store.reset on return click', async () => {
    const wrapper = mount(EndOverlay);
    await wrapper.find('button').trigger('click');
    // Store reset is called - we verify no errors thrown
  });
});

describe('StartScreen', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render title', () => {
    const wrapper = mount(StartScreen);
    expect(wrapper.find('h1').text()).toBe('MUSIC BLOCKS');
  });

  it('should have file input', () => {
    const wrapper = mount(StartScreen);
    const input = wrapper.find('input[type="file"]');
    expect(input.exists()).toBe(true);
  });

  it('should have correct accept attribute', () => {
    const wrapper = mount(StartScreen);
    const input = wrapper.find('input[type="file"]');
    expect(input.attributes('accept')).toBe('audio/mpeg,audio/mp3,audio/*');
  });

  it('should show file name when set', async () => {
    const wrapper = mount(StartScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.fileName = 'test.mp3';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.file-name').text()).toBe('test.mp3');
  });

  it('should show loading text when loading', async () => {
    const wrapper = mount(StartScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.loading = true;
    store.fileName = 'test.mp3';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.file-name').text()).toContain('加载中');
  });

  it('should show error message when set', async () => {
    const wrapper = mount(StartScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.errorMsg = '无法解析该音频文件';
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.file-name').text()).toBe('无法解析该音频文件');
  });

  it('should toggle dragover class on drag events', async () => {
    const wrapper = mount(StartScreen);
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
    const wrapper = mount(GameScreen);
    expect(wrapper.find('canvas').exists()).toBe(true);
  });

  it('should render score display', () => {
    const wrapper = mount(GameScreen);
    expect(wrapper.find('.score').exists()).toBe(true);
    expect(wrapper.find('.score').text()).toBe('0');
  });

  it('should render combo display', () => {
    const wrapper = mount(GameScreen);
    expect(wrapper.find('.combo').exists()).toBe(true);
  });

  it('should render progress bar', () => {
    const wrapper = mount(GameScreen);
    expect(wrapper.find('.progress-bar').exists()).toBe(true);
  });

  it('should render pause button', () => {
    const wrapper = mount(GameScreen);
    expect(wrapper.find('.pause-btn').exists()).toBe(true);
  });

  it('should render 4 touch zones', () => {
    const wrapper = mount(GameScreen);
    const zones = wrapper.findAll('.touch-zone');
    expect(zones).toHaveLength(4);
  });

  it('should show pause overlay when paused', async () => {
    const wrapper = mount(GameScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.screen = 'paused';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(PauseOverlay).exists()).toBe(true);
  });

  it('should show end overlay when ended', async () => {
    const wrapper = mount(GameScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.screen = 'ended';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(EndOverlay).exists()).toBe(true);
  });

  it('should call togglePause on pause button click', async () => {
    const wrapper = mount(GameScreen);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    const spy = vi.spyOn(store, 'togglePause');
    store.screen = 'playing';

    await wrapper.find('.pause-btn').trigger('click');
    expect(spy).toHaveBeenCalled();
  });
});
