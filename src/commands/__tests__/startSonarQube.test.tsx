/// <reference types="jest" />

import { startSonarQubeLogic as startSonarQube } from "../../lib/sonarQubeStarter";

// Mock i18n
jest.mock("../../i18n", () => ({
  __: jest.fn((key: string) => {
    // Map the keys used in the component to test-friendly values
    const translations: Record<string, string> = {
      "errors.configurationError": "Configuration Error",
      "errors.missingPodmanDir": "Missing Podman directory",
      "commands.startSonarQube.alreadyRunning": "SonarQube Status",
      "commands.startSonarQube.success": "SonarQube Started",
      "commands.startSonarQube.error": "Failed to Start SonarQube",
    };
    return translations[key] || key;
  }),
}));

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: '', title: '', message: '' }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
}));
jest.mock("../../utils", () => ({
  isSonarQubeRunning: jest.fn(),
  runCommand: jest.fn(),
}));

const { getPreferenceValues, showToast } = require("@raycast/api");
const { isSonarQubeRunning, runCommand } = require("../../utils");

describe("startSonarQube", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error if Podman dir is missing", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: undefined });
    await startSonarQube();
    // With i18n, only check for the toast style
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure" })
    );
    expect(isSonarQubeRunning).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("shows success if SonarQube already running", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });
    
    // The actual function expects a detailed response object when called with {detailed: true}
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      if (options && options.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    await startSonarQube();
    
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Success", title: "SonarQube Status" })
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("runs podman command if not running", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });
    isSonarQubeRunning.mockResolvedValue(false);
    await startSonarQube();
    // With i18n, check the command is correct but not the exact text of success/failure messages
    expect(runCommand).toHaveBeenCalledWith(
      "podman machine start && podman-compose start",
      expect.any(String),
      expect.any(String),
      { cwd: "/foo/bar" }
    );
  });
});
