import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { startSonarQubeLogic } from "../sonarQubeStarter";
import { isSonarQubeRunning, runCommand } from "../../utils";

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
  isSonarQubeRunning: jest.fn(),
  runCommand: jest.fn(),
}));

// Mock i18n module
jest.mock("../../i18n", () => ({
  __: jest.fn((key) => key), // Return key as translation for testing
}));

describe("sonarQubeStarter", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock preferences
    (getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
    });
  });

  it("should show error when sonarqubePodmanDir is not configured", async () => {
    // Arrange: Preferences without required directory
    (getPreferenceValues as jest.Mock).mockReturnValue({
      sonarqubePodmanDir: "",
    });

    // Act
    await startSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "common.error",
      message: "preferences.sonarqubePodmanDir.description",
    });
    expect(isSonarQubeRunning).not.toHaveBeenCalled();
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should show success when SonarQube is already running", async () => {
    // Arrange: SonarQube is already running
    (isSonarQubeRunning as jest.Mock).mockResolvedValue({
      running: true,
      status: "running",
      details: "SonarQube is running on port 9000",
    });

    // Act
    await startSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "commands.startSonarQube.alreadyRunning",
      message: "SonarQube is running on port 9000",
    });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should show starting message when SonarQube is in starting state", async () => {
    // Arrange: SonarQube is starting
    (isSonarQubeRunning as jest.Mock).mockResolvedValue({
      running: false,
      status: "starting",
      details: "SonarQube is starting",
    });

    // Act
    await startSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Animated,
      title: "commands.startSonarQube.starting",
      message: "commands.startSonarQube.pleaseWait",
    });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should check again with longer timeout when timeout status is received", async () => {
    // Arrange: First check times out, second check shows starting
    (isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
      running: false,
      status: "timeout",
    }).mockResolvedValueOnce({
      running: false, 
      status: "starting",
      details: "SonarQube is starting",
    });

    // Act
    await startSonarQubeLogic();

    // Assert
    expect(showToast).toHaveBeenCalledTimes(2);
    expect(showToast).toHaveBeenNthCalledWith(1, {
      style: Toast.Style.Animated,
      title: "commands.startSonarQube.starting",
      message: "commands.startSonarQube.checkingStatus",
    });
    expect(showToast).toHaveBeenNthCalledWith(2, {
      style: Toast.Style.Success,
      title: "commands.startSonarQube.starting",
      message: "SonarQube is starting",
    });
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2);
    expect(isSonarQubeRunning).toHaveBeenNthCalledWith(2, { detailed: true, timeout: 5000 });
    expect(runCommand).not.toHaveBeenCalled();
  });

  it("should start SonarQube when it is not running", async () => {
    // Arrange: SonarQube is not running
    (isSonarQubeRunning as jest.Mock).mockResolvedValue({
      running: false,
      status: "down",
    });
    (runCommand as jest.Mock).mockResolvedValue(undefined);

    // Act
    await startSonarQubeLogic();

    // Assert
    expect(runCommand).toHaveBeenCalledWith(
      "podman machine start && podman-compose start",
      "commands.startSonarQube.startSuccess",
      "commands.startSonarQube.startError",
      { cwd: "/mock/path" }
    );
  });
});
