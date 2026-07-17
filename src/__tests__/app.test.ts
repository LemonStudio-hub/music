import { describe, it, expect, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import App from '../App.vue';
import StartScreen from '../components/StartScreen.vue';
import GameScreen from '../components/GameScreen.vue';

describe('App', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should render StartScreen when screen is start', () => {
    const wrapper = mount(App);
    expect(wrapper.findComponent(StartScreen).exists()).toBe(true);
    expect(wrapper.findComponent(GameScreen).exists()).toBe(false);
  });

  it('should render GameScreen when screen is not start', async () => {
    const wrapper = mount(App);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.screen = 'playing';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
    expect(wrapper.findComponent(StartScreen).exists()).toBe(false);
  });

  it('should render GameScreen when paused', async () => {
    const wrapper = mount(App);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.screen = 'paused';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
  });

  it('should render GameScreen when ended', async () => {
    const wrapper = mount(App);
    const { useGameStore } = await import('../stores/game');
    const store = useGameStore();
    store.screen = 'ended';
    await wrapper.vm.$nextTick();
    expect(wrapper.findComponent(GameScreen).exists()).toBe(true);
  });
});
