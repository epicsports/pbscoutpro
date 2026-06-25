import React, { createContext, useContext, useState, useCallback } from 'react';
import T from '../utils/i18n';

const STORAGE_KEY = 'pbscoutpro_lang';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === 'en' ? 'en' : 'pl';
    } catch {
      return 'pl';
    }
  });

  const setLang = useCallback((l) => {
    setLangState(l);
    try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  }, []);

  const t = useCallback((key, ...args) => {
    const val = T[lang]?.[key] ?? T.en?.[key] ?? key;
    // Function-valued keys receive their positional args plus the active `lang`
    // appended as the final argument. Keys with fixed-arity signatures (the vast
    // majority — `(n) =>`, `(n, matches) =>`) simply ignore the trailing arg;
    // plural-aware keys read it as their last param to call plural(lang, …).
    if (typeof val === 'function') return val(...args, lang);
    return val;
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used inside LanguageProvider');
  return ctx;
}
