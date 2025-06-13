/// <reference types="jest" />

import { openSonarQubeAppLogic } from "../lib/sonarQubeOpener";
import { getPreferenceValues, showToast, Toast, open } from "@raycast/api";

// Mock dependencies
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: "", title: "", message: "" }),
  Toast: { Style: { Animated: "Animated", Success: "Success", Failure: "Failure" } },
  open: jest.fn().mockResolvedValue(undefined),
  openExtensionPreferences: jest.fn(),
}));

jest.mock("../i18n", () => ({
  __: jest.fn((key: string) => key),
}));

const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
const mockShowToast = showToast as jest.Mock;
const mockOpen = open as jest.Mock;

describe("openSonarQubeApp", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default preferences
    mockGetPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: "",
    });
  });

  it("opens default SonarQube URL when custom app is not enabled", async () => {
    await openSonarQubeAppLogic();

    expect(mockOpen).toHaveBeenCalledWith("http://localhost:9000");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Success,
        title: "commands.openSonarQubeApp.title",
      }),
    );
  });

  it("opens custom SonarQube app when configured", async () => {
    mockGetPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/Applications/Custom/SonarQube.app",
    });

    await openSonarQubeAppLogic();

    expect(mockOpen).toHaveBeenCalledWith("/Applications/Custom/SonarQube.app");
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Success,
        title: "commands.openSonarQubeApp.title",
      }),
    );
  });

  it("shows error when custom app is enabled but path not set", async () => {
    mockGetPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    await openSonarQubeAppLogic();

    expect(mockOpen).not.toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Failure,
        title: "preferences.useCustomSonarQubeApp.title",
      }),
    );
  });

  it("handles errors when opening app", async () => {
    mockOpen.mockRejectedValue(new Error("Failed to open app"));

    await openSonarQubeAppLogic();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Failure,
        title: "commands.openSonarQubeApp.openError",
      }),
    );
  });
});
