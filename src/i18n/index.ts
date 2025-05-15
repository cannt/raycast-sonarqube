/**
 * Internationalization (i18n) utility for SonarQube Tools extension
 * 
 * Provides translation functionality with language detection and fallback
 */

import { getPreferenceValues } from "@raycast/api";
import { en, es, TranslationDictionary } from "./translations/index";

// Supported languages
export type Language = "en" | "es";

// Translation dictionaries
const translations = {
  en,
  es,
};

// Language preference or system detection
export function getLanguage(): Language {
  try {
    // Get language preference if set
    const prefs = getPreferenceValues<{ language?: string }>();
    const prefLang = prefs.language as Language;
    
    // Check if the preferred language is supported
    if (prefLang && Object.keys(translations).includes(prefLang)) {
      return prefLang;
    }
    
    // Fallback: try to detect system language (Mac OS locale)
    const sysLang = Intl.DateTimeFormat().resolvedOptions().locale.split("-")[0] as Language;
    if (Object.keys(translations).includes(sysLang)) {
      return sysLang;
    }
  } catch (error) {
    console.error("Error detecting language:", error);
  }
  
  // Default fallback
  return "en";
}

/**
 * Translate a key to the current language
 * 
 * @param key The translation key to lookup
 * @param params Optional parameters to substitute in the translation
 * @returns The translated string or the key if translation not found
 */
export function t(key: string, params?: Record<string, string>): string {
  const lang = getLanguage();
  let translated = key;
  
  try {
    // Get the translation from the dictionary
    const translationObj = translations[lang];
    const keyParts = key.split(".");
    
    // Navigate the nested translation object
    let current: any = translationObj;
    for (const part of keyParts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        // Key not found in this language
        current = null;
        break;
      }
    }
    
    if (current && typeof current === "string") {
      translated = current;
      
      // Replace any parameters
      if (params) {
        Object.entries(params).forEach(([key, value]) => {
          translated = translated.replace(new RegExp(`{{${key}}}`, "g"), value);
        });
      }
    } else if (lang !== "en") {
      // Try English as fallback if not already using it
      const enTranslation = translations.en;
      let fallback: any = enTranslation;
      
      for (const part of keyParts) {
        if (fallback && typeof fallback === "object" && part in fallback) {
          fallback = fallback[part];
        } else {
          fallback = null;
          break;
        }
      }
      
      if (fallback && typeof fallback === "string") {
        translated = fallback;
        
        // Replace any parameters in the fallback
        if (params) {
          Object.entries(params).forEach(([key, value]) => {
            translated = translated.replace(new RegExp(`{{${key}}}`, "g"), value);
          });
        }
      }
    }
  } catch (error) {
    console.error(`Error translating key: ${key}`, error);
  }
  
  return translated;
}

// Shorthand alias
export const __ = t;

export default {
  t,
  __,
  getLanguage,
};
