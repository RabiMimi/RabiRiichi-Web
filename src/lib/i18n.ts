import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import zhs from '../locales/zhs.json';
import ja from '../locales/ja.json';

const LOCAL_STORAGE_KEY = 'i18n_lang';

const getInitialLanguage = (): string => {
  if (typeof localStorage !== 'undefined' && typeof localStorage.getItem === 'function') {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      return saved;
    }
  }

  if (typeof navigator !== 'undefined') {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('zh')) {
      return 'zhs';
    }
    if (browserLang.startsWith('ja')) {
      return 'ja';
    }
  }
  return 'en';
};

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zhs: { translation: zhs },
    ja: { translation: ja },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  if (typeof localStorage !== 'undefined' && typeof localStorage.setItem === 'function') {
    localStorage.setItem(LOCAL_STORAGE_KEY, lng);
  }
});

export default i18n;
