export type LanguageCode = "en" | "hi" | "ru" | "ng";

/** Top 4 supported interface languages. English is the default. */
export const LANGUAGES: { code: LanguageCode; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "hi", label: "हिन्दी", flag: "🇮🇳" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "ng", label: "Nigerian English", flag: "🇳🇬" },
];

export const DEFAULT_LANGUAGE: LanguageCode = "en";
