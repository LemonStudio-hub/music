import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from '@/App.vue';
import { i18n } from '@/i18n';
import './style.css';

// Prevent gestures and zoom during gameplay
document.addEventListener('touchmove', (e: TouchEvent) => e.preventDefault(), { passive: false });
document.addEventListener('gesturestart', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('gesturechange', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('gestureend', (e: Event) => e.preventDefault(), { passive: false });
document.addEventListener('wheel', (e: WheelEvent) => e.preventDefault(), { passive: false });

// Scope contextmenu/dblclick prevention to canvas only (preserves right-click elsewhere for a11y)
document.addEventListener('contextmenu', (e: Event) => {
  if ((e.target as HTMLElement).tagName === 'CANVAS') e.preventDefault();
});
document.addEventListener('dblclick', (e: Event) => {
  if ((e.target as HTMLElement).tagName === 'CANVAS') e.preventDefault();
});

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
app.use(i18n);
app.mount('#app');
