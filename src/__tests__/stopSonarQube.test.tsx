/// <reference types="jest" />

// Mock dependencies first, before any imports
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: "", title: "", message: "", hide: jest.fn() }),
  Toast: { Style: { Animated: "Animated", Success: "Success", Failure: "Failure" } },
  openExtensionPreferences: jest.fn(),
}));

// Define mock implementations for utils
jest.mock("../utils", () => {
  return {
    runCommand: jest.fn(),
    loadProjects: jest.fn().mockResolvedValue([{ id: "test-id", name: "Test Project", path: "/test/path" }]),
  };
});

jest.mock("../i18n", () => ({
  __: jest.fn((key: string) => key),
}));

// Now import the modules after mocking
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { stopSonarQubeLogic } from "../lib/sonarQubeStopper";
import { runCommand } from "../utils";

// Extract mocked functions
const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
const mockShowToast = showToast as jest.Mock;
const mockRunCommand = runCommand as jest.Mock;

describe("stopSonarQube", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set up mocks to respond with success by default
    mockRunCommand.mockResolvedValue({ stdout: "", stderr: "" });
  });

  it("shows error if Podman dir is missing", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "" });

    await stopSonarQubeLogic();

    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: Toast.Style.Failure }));
  });

  it("runs podman stop commands when Podman dir is configured", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });

    // Mock toast to return different objects for each call
    const mockToast1 = { style: Toast.Style.Animated, title: "commands.stopSonarQube.stoppingGradle", hide: jest.fn() };
    const mockToast2 = { style: Toast.Style.Success, title: "commands.stopSonarQube.success", hide: jest.fn() };

    mockShowToast.mockResolvedValueOnce(mockToast1).mockResolvedValueOnce(mockToast2);

    await stopSonarQubeLogic();

    // Verify the podman command was called
    expect(mockRunCommand).toHaveBeenCalledWith(
      expect.stringContaining("podman"),
      expect.any(String),
      expect.any(String),
      expect.any(Object),
    );

    // Verify a toast was shown (we'll just check the most recent call for simplicity)
    expect(mockShowToast).toHaveBeenCalled();
    // Check the toast parameters, not the specific call number
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({ style: Toast.Style.Animated }));
  });

  it("handles errors during podman command execution", async () => {
    mockGetPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });

    // Make runCommand throw an error
    mockRunCommand.mockRejectedValueOnce(new Error("Command failed"));

    // Spy on console.error to verify it's called
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    await stopSonarQubeLogic();

    // Verify error was logged
    expect(consoleErrorSpy).toHaveBeenCalled();

    // Clean up
    consoleErrorSpy.mockRestore();
  });
});
