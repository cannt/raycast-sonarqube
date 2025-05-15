/**
 * Export all translations from a single entry point
 */

import en from "./en";
import es from "./es";

export { en, es };

// Define the translation structure type
export type TranslationDictionary = typeof en;
