"use client";

import {
  createContext,
  useContext,
  useCallback,
  useSyncExternalStore,
  ReactNode,
} from "react";
import { translations, Language } from "@/shared/i18n/i18n";

export const LOCALE_MAP: Record<Language, string> = {
  en: "en-GB",
  fr: "fr-FR",
  hy: "hy-AM",
};

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  locale: string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Custom event used to broadcast in-tab language changes to all subscribers,
// since `storage` events are only fired in other tabs.
const LANGUAGE_EVENT = "ufar:language-changed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(LANGUAGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(LANGUAGE_EVENT, callback);
  };
}

function getClientSnapshot(): Language {
  try {
    const saved = localStorage.getItem("language") as Language | null;
    if (saved && translations[saved]) return saved;
  } catch {
    /* localStorage may be unavailable (e.g. private mode) */
  }
  return "en";
}

function getServerSnapshot(): Language {
  return "en";
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const language = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot,
  );

  const setLanguage = useCallback((lang: Language) => {
    try {
      localStorage.setItem("language", lang);
    } catch {
      /* ignore */
    }
    document.cookie = `language=${lang};path=/;max-age=31536000;samesite=lax`;
    window.dispatchEvent(new Event(LANGUAGE_EVENT));
  }, []);

  const t = useCallback(
    (key: string): string => {
      const keys = key.split(".");
      let value: any = translations[language];

      for (const k of keys) {
        if (value && typeof value === "object" && k in value) {
          value = value[k];
        } else {
          // Fallback to English if translation not found
          value = translations.en;
          for (const fallbackKey of keys) {
            if (value && typeof value === "object" && fallbackKey in value) {
              value = value[fallbackKey];
            } else {
              return key; // Return key if translation not found
            }
          }
          break;
        }
      }

      return typeof value === "string" ? value : key;
    },
    [language],
  );

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t, locale: LOCALE_MAP[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
