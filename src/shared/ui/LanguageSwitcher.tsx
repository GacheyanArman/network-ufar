"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/shared/i18n/i18n";

const TWEMOJI_BASE =
  "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; emoji: string; code2: string }[] = [
    { code: "en", emoji: "🇬🇧", code2: "1f1ec-1f1e7" },
    { code: "fr", emoji: "🇫🇷", code2: "1f1eb-1f1f7" },
    { code: "hy", emoji: "🇦🇲", code2: "1f1e6-1f1f2" },
  ];

  return (
    <div className="language-switcher">
      {languages.map((lang) => (
        <button
          key={lang.code}
          type="button"
          onClick={() => setLanguage(lang.code)}
          className={`lang-flag-btn${language === lang.code ? " active" : ""}`}
          title={
            lang.code === "en"
              ? "English"
              : lang.code === "fr"
                ? "Français"
                : "Հայերեն"
          }
        >
          <img
            src={TWEMOJI_BASE + lang.code2 + ".svg"}
            alt={lang.emoji}
            className="lang-flag-img"
            width={22}
            height={22}
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

        .lang-flag-img {
          width: 20px;
          height: 20px;
          display: block;
          object-fit: contain;
          pointer-events: none;
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
