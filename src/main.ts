import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './style.css';

// Prevent all browser default gestures
document.addEventListener('touchmove', (e: TouchEvent) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('wheel', (e: WheelEvent) => e.preventDefault(), { passive: false });
document.addEventListener('contextmenu', (e: Event) => e.preventDefault());
document.addEventListener('dblclick', (e: Event) => e.preventDefault());

// Prevent pinch zoom
document.addEventListener('keydown', (e: KeyboardEvent) => {
  if (
    (e.ctrlKey || e.metaKey) &&
    (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
  ) {
    e.preventDefault();
  }
});

const app = createApp(App);
app.use(createPinia());
app.mount('#app');
