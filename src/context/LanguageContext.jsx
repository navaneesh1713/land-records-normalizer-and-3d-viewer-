import React, { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी', flag: '🇮🇳' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు', flag: '🏛️' },
];

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      const saved = localStorage.getItem('sih_language');
      if (saved && ['en', 'hi', 'te'].includes(saved)) {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'en';
  });

  const setLanguage = (langCode) => {
    if (['en', 'hi', 'te'].includes(langCode)) {
      setLanguageState(langCode);
      try {
        localStorage.setItem('sih_language', langCode);
      } catch {
        // ignore
      }
    }
  };

  const t = (key, fallback = '') => {
    if (!key) return fallback;
    const currentDict = translations[language] || translations.en;
    if (currentDict && currentDict[key] !== undefined) {
      return currentDict[key];
    }
    const englishDict = translations.en;
    if (englishDict && englishDict[key] !== undefined) {
      return englishDict[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    // Fallback if rendered outside provider
    return {
      language: 'en',
      setLanguage: () => {},
      t: (k, fallback) => fallback || k,
      languages: LANGUAGES,
    };
  }
  return context;
}
