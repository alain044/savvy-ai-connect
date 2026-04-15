import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import en from './locales/en';
import fr from './locales/fr';
import rw from './locales/rw';
import zh from './locales/zh';
import sw from './locales/sw';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en, fr, rw, zh, sw },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
