/// <reference types="jest" />

import stopSonarQube from "./stopSonarQube";

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: '', title: '', message: '' }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
}));
jest.mock("./utils", () => ({
  runCommand: jest.fn(),
  loadProjects: jest.fn().mockResolvedValue([]),
}));

const { getPreferenceValues, showToast } = require("@raycast/api");
const { runCommand, loadProjects } = require("./utils");

describe("stopSonarQube", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error if Podman dir is missing", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: undefined });
    await stopSonarQube();
    // With i18n, only check for the correct toast style but not the exact text
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure" })
    );
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("attempts to stop gradle in all projects", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });
    loadProjects.mockResolvedValue([{ id: "test", name: "Test Project", path: "/test/project" }]);
    await stopSonarQube();
    // With i18n, only check for the correct toast style
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Animated" })
    );
    // Instead of checking exact strings, just verify the call was made with the right command
    expect(runCommand).toHaveBeenCalledWith(
      "./gradlew --stop",
      expect.any(String),
      expect.any(String),
      { cwd: "/test/project" }
    );
  });

  it("shows toast if no projects are configured", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar" });
    loadProjects.mockResolvedValue([]);
    await stopSonarQube();
    // With i18n, we'll just check that the toast was called
    expect(showToast).toHaveBeenCalled();
  });

  it("runs podman stop command always if Podman dir is set", async () => {
    getPreferenceValues.mockReturnValue({ sonarqubePodmanDir: "/foo/bar", rfidProjectDir: undefined });
    await stopSonarQube();
    // With i18n, we check the command is correct but not the exact text of success/failure messages
    expect(runCommand).toHaveBeenCalledWith(
      "podman-compose stop && podman machine stop",
      expect.any(String),
      expect.any(String),
      { cwd: "/foo/bar" }
    );
  });
});
