/// <reference types="jest" />

import { startSonarQubeLogic } from "../lib/sonarQubeStarter";
import { isSonarQubeRunning, runCommand } from "../utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

// Mock dependencies
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: "", title: "", message: "" }),
  Toast: { Style: { Animated: "Animated", Success: "Success", Failure: "Failure" } },
}));

jest.mock("../utils", () => ({
  isSonarQubeRunning: jest.fn(),
  runCommand: jest.fn(),
}));

jest.mock("../i18n", () => ({
  __: jest.fn((key: string) => {
    // Translate key directly for simplicity in tests
    return key;
  }),
}));

const { __ } = require("../i18n");
const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
const mockShowToast = showToast as jest.Mock;
const mockIsSonarQubeRunning = isSonarQubeRunning as jest.Mock;
const mockRunCommand = runCommand as jest.Mock;

describe("startSonarQube", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error if Podman dir is missing", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: undefined });
    await startSonarQubeLogic();

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: Toast.Style.Failure }));
    expect(mockIsSonarQubeRunning).not.toHaveBeenCalled();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });

  it("shows success if SonarQube already running", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });

    // The actual function expects a detailed response object when called with {detailed: true}
    mockIsSonarQubeRunning.mockImplementation(
      async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
        if (options && options.detailed) {
          return { running: true, status: "running", details: "SonarQube is running" };
        }
        return true;
      },
    );

    await startSonarQubeLogic();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Success,
        title: "commands.startSonarQube.alreadyRunning",
      }),
    );
    expect(mockRunCommand).not.toHaveBeenCalled();
  });

  it("runs podman command if not running", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });
    mockIsSonarQubeRunning.mockResolvedValue(false);
    await startSonarQubeLogic();

    expect(mockRunCommand).toHaveBeenCalledWith(
      "podman machine start && podman-compose start",
      expect.any(String),
      expect.any(String),
      { cwd: "/foo/bar" },
    );
  });
});
