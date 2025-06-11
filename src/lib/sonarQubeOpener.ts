import { getPreferenceValues, open, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { Preferences } from "../utils";
import { __ } from "../i18n";
import { hasSonarQubePathPromptBeenShown, markSonarQubePathPromptAsShown } from "../utils/sessionState";

const DEFAULT_SONARQUBE_URL = "http://localhost:9000";

/**
 * Logic to open SonarQube application or web URL
 */
export async function openSonarQubeAppLogic() {
  const { useCustomSonarQubeApp, sonarqubeAppPath } = getPreferenceValues<Preferences>();

  let targetPath: string;

  if (useCustomSonarQubeApp) {
    if (!sonarqubeAppPath || sonarqubeAppPath.trim() === "") {
      // Only show the toast once per session
      if (!hasSonarQubePathPromptBeenShown()) {
        markSonarQubePathPromptAsShown();
        await showToast({
          style: Toast.Style.Failure,
          title: __("preferences.useCustomSonarQubeApp.title"),
          message: __("preferences.sonarqubeAppPath.description"),
          // @ts-ignore - primaryAction is actually supported but not in the type definitions
          primaryAction: {
            title: __("preferences.language.title"),
            onAction: async (toast: any) => {
              await openExtensionPreferences();
              // @ts-ignore - hide method exists but isn't in the type definition
              toast.hide();
            },
          },
        });
      }
      return;
    }
    targetPath = sonarqubeAppPath;
  } else {
    targetPath = DEFAULT_SONARQUBE_URL;
  }

  try {
    await open(targetPath);
    await showToast({
      style: Toast.Style.Success,
      title: __("commands.openSonarQubeApp.title"),
      message: `${__("commands.openSonarQubeApp.opening")} ${targetPath}`,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: __("commands.openSonarQubeApp.openError"),
      message: errorMessage,
    });
    console.error(__("errors.generic", { message: `${targetPath}` }));
    console.error(errorMessage);
  }
}
