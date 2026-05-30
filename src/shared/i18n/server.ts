import { translations, Language } from "@/shared/i18n/i18n";

/**
 * Server-side translator factory.
 *
 * Usage in async Server Components:
 * ```ts
 * import { cookies } from "next/headers";
 * import { getServerTranslator } from "@/shared/i18n/server";
 *
 * const cookieStore = await cookies();
 * const lang = (cookieStore.get("language")?.value || "en") as Language;
 * const t = getServerTranslator(lang);
 * ```
 */
export function getServerTranslator(lang: Language) {
  const dict = translations[lang] ?? translations["en"];

  return function t(key: string): string {
    const keys = key.split(".");
    let value: any = dict;

    for (const k of keys) {
      if (value != null && typeof value === "object" && k in value) {
        value = value[k];
      } else {
        // Fallback to English
        let enValue: any = translations["en"];
        for (const enK of keys) {
          if (enValue != null && typeof enValue === "object" && enK in enValue) {
            enValue = enValue[enK];
          } else {
            return key;
          }
        }
        return typeof enValue === "string" ? enValue : key;
      }
    }

    return typeof value === "string" ? value : key;
  };
}
