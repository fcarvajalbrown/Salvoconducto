import { EN } from './strings/en.mjs';
import { ES } from './strings/es.mjs';

const TABLES = { en: EN, es: ES };

export function createI18n(initial = 'en') {
  const state = { lang: initial };
  return {
    get lang() { return state.lang; },
    setLang(code) { if (TABLES[code]) state.lang = code; },
    t(key, vars = {}) {
      let s = (TABLES[state.lang] ?? EN)[key] ?? key;
      for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(String(v));
      return s;
    },
  };
}
