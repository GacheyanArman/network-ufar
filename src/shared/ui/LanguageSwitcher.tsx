"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/shared/i18n/i18n";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; country: string; title: string }[] = [
    { code: "en", country: "gb", title: "English" },
    { code: "fr", country: "fr", title: "Français" },
    { code: "hy", country: "am", title: "Հայերեն" },
  ];

  return (
    <div className="language-switcher">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={`lang-flag-btn${language === lang.code ? " active" : ""}`}
          title={lang.title}
        >
          <img 
            src={`https://flagcdn.com/w20/${lang.country}.png`} 
            srcSet={`https://flagcdn.com/w40/${lang.country}.png 2x`}
            width="20" 
            alt={lang.title} 
            style={{ borderRadius: "2px", display: "block" }}
          />
        </button>
      ))}

      <style jsx>{`
        .language-switcher {
          display: flex;
          gap: 2px;
          align-items: center;
        }

        .lang-flag-btn {
          width: 28px;
          height: 28px;
          border-radius: 6px;
          border: 2px solid transparent;
          background: transparent;
          cursor: pointer;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s ease;
          opacity: 0.55;
          padding: 0;
          line-height: 1;
        }

        .lang-flag-btn:hover {
          opacity: 0.85;
          background: var(--bg-hover);
        }

        .lang-flag-btn.active {
          opacity: 1;
          border-color: var(--french-blue, #2563eb);
          background: var(--french-blue-soft, rgba(37, 99, 235, 0.08));
        }

        @media (max-width: 768px) {
          .lang-flag-btn {
            width: 24px;
            height: 24px;
            font-size: 14px;
          }
        }
      `}</style>
    </div>
  );
}
