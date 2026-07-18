import { createI18n } from 'vue-i18n';
import zh from './locales/zh';
import en from './locales/en';

function detectLocale(): 'zh' | 'en' {
  const saved = localStorage.getItem('locale');
  if (saved === 'zh' || saved === 'en') return saved;
  const lang = navigator.language.toLowerCase();
  return lang.startsWith('zh') ? 'zh' : 'en';
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { zh, en },
});

export function setLocale(locale: 'zh' | 'en'): void {
  i18n.global.locale.value = locale;
  localStorage.setItem('locale', locale);
}
