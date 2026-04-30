"use client";

import { useLanguage } from "@/contexts/LanguageContext";
import { Language } from "@/lib/i18n";

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  const languages: { code: Language; label: string; flag: string }[] = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "fr", label: "Français", flag: "🇫🇷" },
    { code: "hy", label: "Հայերեն", flag: "🇦🇲" },
  ];

  return (
    <div className="language-switcher">
      <select
        value={language}
        onChange={(e) => setLanguage(e.target.value as Language)}
        className="language-select"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.label}
          </option>
        ))}
      </select>

      <style jsx>{`
        .language-switcher {
          display: flex;
          align-items: center;
        }

        .language-select {
          padding: 6px 12px;
          border-radius: 8px;
          border: 1px solid var(--border-color);
          background: var(--bg-primary);
          color: var(--text-primary);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .language-select:hover {
          border-color: var(--french-blue);
          background: var(--bg-secondary);
        }

        .language-select:focus {
          outline: none;
          border-color: var(--french-blue);
          box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.1);
        }

        @media (max-width: 768px) {
          .language-select {
            font-size: 13px;
            padding: 4px 8px;
          }
        }
      `}</style>
    </div>
  );
}
