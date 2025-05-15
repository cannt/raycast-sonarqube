/**
 * React hook for using translations in components
 */
import { useState, useEffect } from "react";
import { getPreferenceValues } from "@raycast/api";
import { t, getLanguage, __ } from "./index";

/**
 * React hook to use internationalization in components
 * Returns the current language and translation functions
 */
export function useTranslation() {
  const [language, setLanguage] = useState(getLanguage());
  
  // Update language if preferences change
  useEffect(() => {
    const currentLang = getLanguage();
    if (currentLang !== language) {
      setLanguage(currentLang);
    }
  }, [language]);
  
  return {
    language,
    t,
    __,
  };
}

export default useTranslation;
