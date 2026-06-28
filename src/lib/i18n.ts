import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from '../locales/en.json';
import zhs from '../locales/zhs.json';

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    zhs: { translation: zhs },
  },
  lng: 'zhs',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
