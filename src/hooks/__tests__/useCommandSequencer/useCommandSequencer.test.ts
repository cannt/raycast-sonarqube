import { useCommandSequencer } from "../../useCommandSequencer";
import { isSonarQubeRunning, runInNewTerminal } from "../../../utils";
import { showToast, Toast, getPreferenceValues } from "@raycast/api";

// Mock dependencies
jest.mock("../../../utils", () => ({
  isSonarQubeRunning: jest.fn(),
  runInNewTerminal: jest.fn(),
}));

jest.mock("@raycast/api", () => ({
  showToast: jest.fn(),
  getPreferenceValues: jest.fn().mockReturnValue({
    sonarqubePodmanDir: "/path/to/sonarqube-podman"
  }),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
      Animated: "animated"
    }
  }
}));

jest.mock("../../../i18n", () => ({
  __: (key: string, params?: any) => {
    if (params) {
      return `translated:${key}:${JSON.stringify(params)}`;
    }
    return `translated:${key}`;
  }
}));

describe("useCommandSequencer", () => {
  const mockRunInNewTerminal = runInNewTerminal as jest.Mock;
  const mockIsSonarQubeRunning = isSonarQubeRunning as jest.Mock;
  const mockShowToast = showToast as jest.Mock;

  const projectPath = "/path/to/project";
  const projectName = "Test Project";
  const targetOpenPath = "http://localhost:9000";
  let hook: ReturnType<typeof useCommandSequencer>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockRunInNewTerminal.mockResolvedValue(undefined);
    mockShowToast.mockResolvedValue(undefined);
    
    // Initialize the hook
    hook = useCommandSequencer();
  });

  it("should handle already running SonarQube", async () => {
    // Mock SonarQube as already running
    mockIsSonarQubeRunning.mockResolvedValueOnce({
      running: true,
      status: "running",
      details: "SonarQube is running",
    });

    await hook.performStartAnalyzeSequence(projectPath, projectName, targetOpenPath);

    // Should show success toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Success,
      })
    );

    // Should run commands with analysis only (no startup)
    expect(mockRunInNewTerminal).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining(`cd "${projectPath}"`),
        expect.stringContaining("gradlew clean test jacocoTestReport detekt sonar"),
      ]),
      expect.any(String),
      expect.any(String),
      expect.any(Object)
    );
  });

  it("should handle starting SonarQube when not running", async () => {
    // Mock SonarQube as not running
    mockIsSonarQubeRunning.mockResolvedValueOnce({
      running: false,
      status: "stopped",
    });

    await hook.performStartAnalyzeSequence(projectPath, projectName, targetOpenPath);

    // Should show starting toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Animated,
      })
    );

    // Should run commands with startup and analysis
    expect(mockRunInNewTerminal).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.stringContaining("podman machine start"),
        expect.stringContaining("sleep 30"),
        expect.stringContaining("gradlew clean test jacocoTestReport detekt sonar"),
      ]),
      expect.any(String),
      expect.any(String),
      expect.any(Object)
    );
  });

  it("should handle timeout status with retry", async () => {
    // First check times out, then succeeds on retry
    mockIsSonarQubeRunning
      .mockResolvedValueOnce({
        running: false,
        status: "timeout",
      })
      .mockResolvedValueOnce({
        running: true,
        status: "running",
      });

    await hook.performStartAnalyzeSequence(projectPath, projectName, targetOpenPath);

    // Should check status twice (initial + retry)
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    // Should show checking status toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Animated,
      })
    );
  });

  it("should handle timeout status with SonarQube not running", async () => {
    // Both checks indicate SonarQube is not running
    mockIsSonarQubeRunning
      .mockResolvedValueOnce({
        running: false,
        status: "timeout",
      })
      .mockResolvedValueOnce({
        running: false,
        status: "stopped",
      });

    await hook.performStartAnalyzeSequence(projectPath, projectName, targetOpenPath);

    // Should check status twice (initial + retry)
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    // Should show starting toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Animated,
        title: "translated:commands.startSonarQube.title",
      })
    );
  });
});
