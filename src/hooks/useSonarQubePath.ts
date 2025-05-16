import { useState } from "react";
import { getPreferenceValues, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { Preferences } from "../utils";
import { __ } from "../i18n";

const DEFAULT_SONARQUBE_URL = "http://localhost:9000";

/**
 * Custom hook to handle SonarQube path resolution
 * Extracts path resolution logic from the main component
 */
export function useSonarQubePath() {
  const [pathError, setPathError] = useState<Error | null>(null);
  const preferences = getPreferenceValues<Preferences>();
  
  /**
   * Resolves the SonarQube path based on preferences
   * Returns the path or null if there was an error
   */
  const getSonarQubePath = async () => {
    let targetOpenPath: string;
    
    if (preferences.useCustomSonarQubeApp) {
      if (!preferences.sonarqubeAppPath || preferences.sonarqubeAppPath.trim() === "") {
        const toast = await showToast({
          style: Toast.Style.Failure,
          title: __("preferences.useCustomSonarQubeApp.title"),
          message: __("preferences.sonarqubeAppPath.description"),
          primaryAction: {
            title: __("preferences.language.title"),
            onAction: async (toast) => {
              await openExtensionPreferences();
              toast.hide();
            },
          },
        });
        
        setPathError(new Error("Missing custom SonarQube path"));
        return null; // Return null to indicate error
      }
      
      targetOpenPath = preferences.sonarqubeAppPath;
    } else {
      targetOpenPath = DEFAULT_SONARQUBE_URL;
    }
    
    return targetOpenPath;
  };

  return { getSonarQubePath, pathError };
}
