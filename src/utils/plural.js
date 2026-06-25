/**
 * i18n plural + locale helpers (Stage 1 i18n foundations).
 *
 * `plural(lang, n, forms)` — picks the correct plural form for `n` in `lang`
 * via Intl.PluralRules. `forms` is `{ one, few, many, other }`:
 *   - PL uses one / few / many (e.g. 1 notatka / 2 notatki / 5 notatek)
 *   - EN uses one / other   (e.g. 1 note / 5 notes)
 * Always provide `one` + `other`; provide `few` + `many` for Slavic langs.
 * Falls back: missing category → `other` → `one` → ''.
 *
 * `langToLocale(lang)` — maps the app's 2-letter lang code to a BCP-47 locale
 * for Intl APIs and `toLocale*String()` calls (pl → 'pl-PL', en → 'en-US').
 */

const LOCALE_BY_LANG = {
  pl: 'pl-PL',
  en: 'en-US',
};

export function langToLocale(lang) {
  return LOCALE_BY_LANG[lang] || 'en-US';
}

export function plural(lang, n, forms) {
  const cat = new Intl.PluralRules(langToLocale(lang)).select(n);
  return forms[cat] ?? forms.other ?? forms.one ?? '';
}
