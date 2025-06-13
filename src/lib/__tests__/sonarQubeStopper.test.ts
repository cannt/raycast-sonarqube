import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { stopSonarQubeLogic } from "../sonarQubeStopper";
import { loadProjects, runCommand } from "../../utils";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn(),
  Toast: {
    Style: {
      Animated: "animated",
      Failure: "failure",
      Success: "success",
    },
  },
}));

// Mock utils module
jest.mock("../../utils", () => ({
  loadProjects: jest.fn(),
  runCommand: jest.fn(),
}));

// Mock i18n module
jest.mock("../../i18n", () => ({
  __: jest.fn((key, params) => {
    // Simple handling for parameters in i18n strings
    if (params) {
      return `${key} ${JSON.stringify(params)}`;
    }
    return key;
  }),
}));

// Console error spy
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

describe("sonarQubeStopper", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default mock preferences
    (getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should show error when sonarqubePodmanDir is not configured", async () => {
    // Arrange: Preferences without required directory
    (getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: "",
    });

    // Act
    await stopSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "common.error",
      message: "preferences.sonarqubePodmanDir.description",
    });
    expect(loadProjects).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should show message when no projects are found", async () => {
    // Arrange: No projects
    (loadProjects as jest.Mock).mockResolvedValue([]);

    // Act
    await stopSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      title: "projects.management.title",
      message: "commands.runSonarAnalysis.noProjects",
    });
    expect(runCommand).toHaveBeenCalledWith(
      "podman-compose stop && podman machine stop",
      "commands.stopSonarQube.stopSuccess",
      "commands.stopSonarQube.stopError",
      { cwd: "/mock/path" },
    );
  });

  it("should attempt to stop Gradle for each project", async () => {
    // Arrange: Multiple projects
    const mockProjects = [
      { id: "1", name: "Project1", path: "/path/to/project1" },
      { id: "2", name: "Project2", path: "/path/to/project2" },
    ];
    (loadProjects as jest.Mock).mockResolvedValue(mockProjects);
    (runCommand as jest.Mock).mockResolvedValue(undefined);

    // Act
    await stopSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Animated,
      title: "commands.stopSonarQube.stoppingGradle",
      message: 'terminal.progressTracking {"status":"2 projects"}',
    });

    // Verify Gradle stop for each project
    expect(runCommand).toHaveBeenCalledTimes(3); // 2 projects + 1 podman stop
    expect(runCommand).toHaveBeenNthCalledWith(
      1,
      "./gradlew --stop",
      "terminal.commandSuccess",
      'terminal.commandError {"error":"Project1"}',
      { cwd: "/path/to/project1" },
    );
    expect(runCommand).toHaveBeenNthCalledWith(
      2,
      "./gradlew --stop",
      "terminal.commandSuccess",
      'terminal.commandError {"error":"Project2"}',
      { cwd: "/path/to/project2" },
    );

    // Verify final podman stop
    expect(runCommand).toHaveBeenNthCalledWith(
      3,
      "podman-compose stop && podman machine stop",
      "commands.stopSonarQube.stopSuccess",
      "commands.stopSonarQube.stopError",
      { cwd: "/mock/path" },
    );
  });

  it("should continue with other projects if one fails", async () => {
    // Arrange: Multiple projects with one failing
    const mockProjects = [
      { id: "1", name: "Project1", path: "/path/to/project1" },
      { id: "2", name: "Project2", path: "/path/to/project2" },
    ];
    (loadProjects as jest.Mock).mockResolvedValue(mockProjects);

    // First project fails, second succeeds
    (runCommand as jest.Mock)
      .mockRejectedValueOnce(new Error("Gradle failed"))
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);

    // Act
    await stopSonarQubeLogic();

    // Assert
    expect(runCommand).toHaveBeenCalledTimes(3); // Still tries all projects + podman stop
    expect(consoleErrorSpy).toHaveBeenCalled(); // Error logged for failed project

    // Final podman stop should still be called
    expect(runCommand).toHaveBeenNthCalledWith(
      3,
      "podman-compose stop && podman machine stop",
      "commands.stopSonarQube.stopSuccess",
      "commands.stopSonarQube.stopError",
      { cwd: "/mock/path" },
    );
  });
});
