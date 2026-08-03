import { createContext, useCallback, useContext, useState } from "react";
import { STRINGS } from "./strings.js";

// Locales: English, Korean, Mexican Spanish, Simplified Chinese, Japanese.
// Chosen BEFORE login (picker on the sign-in screen), remembered per device.
// Proper nouns (FAFSA, SAT, PSAT, ACT, AP/IB, Pell, 529, Student Aid Index,
// college/district/state names) stay in English in every language.
export const LOCALES = [
  { code: "en", native: "English" },
  { code: "ko", native: "한국어" },
  { code: "es", native: "Español" },
  { code: "zh", native: "中文" },
  { code: "ja", native: "日本語" },
];

// BCP-47 tags for date formatting and the Google Translate target.
export const LOCALE_TAG = { en: "en-US", ko: "ko-KR", es: "es-MX", zh: "zh-CN", ja: "ja-JP" };
const TRANSLATE_TL = { ko: "ko", es: "es", zh: "zh-CN", ja: "ja" };

const STORAGE_KEY = "gps.locale";

function initialLocale() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && STRINGS[saved]) return saved;
  } catch {
    /* private mode */
  }
  return "en";
}

const LocaleContext = createContext({ locale: "en", setLocale: () => {}, t: (k) => k });

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(initialLocale);

  const setLocale = useCallback((code) => {
    setLocaleState(code);
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* private mode */
    }
  }, []);

  const t = useCallback(
    (key, vars) => {
      let s = STRINGS[locale]?.[key] ?? STRINGS.en[key] ?? key;
      if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
      return s;
    },
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}

export function prettyDate(isoDay, locale) {
  return new Date(isoDay + "T12:00:00").toLocaleDateString(LOCALE_TAG[locale] || "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// For college / EC / scholarship info that only exists in English: a small
// button that opens Google Translate pre-filled in the user's language.
// Renders nothing for English users.
export function TranslateLink({ text }) {
  const { locale, t } = useI18n();
  const tl = TRANSLATE_TL[locale];
  if (!tl || !text) return null;
  const href = `https://translate.google.com/?sl=en&tl=${tl}&text=${encodeURIComponent(text)}&op=translate`;
  return (
    <a className="translate-link" href={href} target="_blank" rel="noreferrer">
      {t("common.translate")} ↗
    </a>
  );
}
