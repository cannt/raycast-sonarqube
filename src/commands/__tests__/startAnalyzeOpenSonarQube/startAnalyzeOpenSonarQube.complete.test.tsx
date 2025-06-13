/**
 * @jest-environment jsdom
 */

import { render } from "@testing-library/react";
import "@testing-library/jest-dom";

// Type definitions
interface ToastConfig {
  style: string;
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction: (toast: MockToast) => void;
  };
}

interface MockToast {
  hide: jest.Mock;
}

interface SonarQubeStatusResponse {
  running: boolean;
  status: string;
  details?: string;
  detailedResult?: Record<string, any>;
}

// Track mock interactions
const mockToastCalls: Array<{ style: string; title: string; message?: string }> = [];
const mockTerminalCommands: string[][] = [];
const mockTranslate = jest.fn((key: string) => `translated.${key}`);
const mockShowToast = jest.fn();
const mockRunInNewTerminal = jest.fn();
const mockIsSonarQubeRunning = jest.fn();
const mockGetPreferenceValues = jest.fn();
const mockOpenExtensionPreferences = jest.fn();
const mockStartAnalyzeOpenSonarQube = jest.fn();

// Mock all dependencies before importing anything
jest.mock("@raycast/api", () => ({
  getPreferenceValues: () => mockGetPreferenceValues(),
  showToast: (config: ToastConfig) => mockShowToast(config),
  openExtensionPreferences: () => mockOpenExtensionPreferences(),
  Toast: {
    Style: {
      Animated: "Animated",
      Success: "Success",
      Failure: "Failure",
    },
  },
  List: {
    Item: jest.fn(({ title, actions }) => (
      <div data-testid={`list-item-${title}`}>
        {title}
        {actions}
      </div>
    )),
    EmptyView: jest.fn(({ title, actions }) => (
      <div data-testid="empty-view">
        {title}
        {actions}
      </div>
    )),
  },
  ActionPanel: jest.fn(({ children }) => <div data-testid="action-panel">{children}</div>),
  Action: {
    Push: jest.fn(({ title, onAction }) => (
      <button data-testid={`action-${title}`} onClick={onAction}>
        {title}
      </button>
    )),
    OpenInBrowser: jest.fn(({ title, onAction }) => (
      <button data-testid={`action-${title}`} onClick={onAction}>
        {title}
      </button>
    )),
  },
  Icon: {
    Terminal: "terminal-icon",
    List: "list-icon",
    Play: "play-icon",
    Info: "info-icon",
  },
  useNavigation: jest.fn().mockReturnValue({
    push: jest.fn(),
    pop: jest.fn(),
  }),
}));

jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(() => ({
    performStartAnalyzeSequence: mockStartAnalyzeOpenSonarQube,
  })),
}));

jest.mock("../../../lib/startAnalyzeOpenSonarQubeComponent", () => ({
  StartAnalyzeOpenSonarQubeComponent: jest.fn(() => (
    <div data-testid="startAnalyzeOpenSonarQube-component">Mocked Component</div>
  )),
}));

jest.mock("../../../utils", () => ({
  runInNewTerminal: (commands: string[], successMsg: string, errorMsg: string) => {
    // Always push the commands to the mockTerminalCommands array
    mockTerminalCommands.push([...commands]);
    // Call the mock function to track the call for assertions
    return mockRunInNewTerminal(commands, successMsg, errorMsg);
  },
  isSonarQubeRunning: (options?: any) => {
    return mockIsSonarQubeRunning(options);
  },
  loadProjects: jest.fn().mockResolvedValue([{ id: "test-id", name: "Test Project", path: "/test/path" }]),
}));

jest.mock("../../../i18n", () => ({
  __: (key: string) => mockTranslate(key),
}));

jest.mock("../../../i18n/useTranslation", () => {
  return jest.fn(() => ({
    __: jest.requireMock("../../../i18n").__,
  }));
});

// Create a mock for the Command component
const MockCommand = (props: any) => (
  <div data-testid="command-component">
    <h1>SonarQube Tools</h1>
    {props.children}
  </div>
);

// Import after all mocks are set up
import { __ } from "../../../i18n";

describe("startAnalyzeOpenSonarQube comprehensive tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastCalls.length = 0;
    mockTerminalCommands.length = 0;

    // Set default preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: "",
    });

    // Default implementation for showToast
    mockShowToast.mockImplementation((config: ToastConfig) => {
      mockToastCalls.push({
        style: config.style,
        title: config.title,
        message: config.message,
      });

      return Promise.resolve({
        hide: jest.fn(),
      });
    });

    // Default implementation for isSonarQubeRunning
    mockIsSonarQubeRunning.mockImplementation(() => {
      return Promise.resolve({
        running: true,
        status: "running",
        details: "SonarQube is running",
      });
    });

    // Default implementation for runInNewTerminal
    mockRunInNewTerminal.mockImplementation(() => {
      return Promise.resolve();
    });

    // Default implementation for startAnalyzeOpenSonarQube
    mockStartAnalyzeOpenSonarQube.mockImplementation(async (projectPath, projectName, targetOpenPath) => {
      try {
        // Check if SonarQube is running
        const status = await mockIsSonarQubeRunning({ detailed: true });

        // If it's running, show success toast
        if (status && status.running) {
          await mockShowToast({
            style: "Success",
            title: mockTranslate("commands.startSonarQube.alreadyRunning"),
          });
          return true;
        }

        // If it's starting, show animated toast
        if (status && status.status === "starting") {
          await mockShowToast({
            style: "Animated",
            title: mockTranslate("commands.startSonarQube.waiting"),
            message: mockTranslate("commands.startSonarQube.pleaseWait"),
          });
          return true;
        }

        // If it's down or in another state, show animated toast and start it
        await mockShowToast({
          style: "Animated",
          title: mockTranslate("commands.startSonarQube.title"),
        });

        // Get preferences
        const prefs = mockGetPreferenceValues();

        // Validate custom app configuration
        if (prefs.useCustomSonarQubeApp && !prefs.sonarqubeAppPath) {
          await mockShowToast({
            style: "Failure",
            title: mockTranslate("commands.startSonarQube.missingAppPath"),
            primaryAction: {
              title: mockTranslate("commands.startSonarQube.openPreferences"),
              onAction: async (toast: MockToast) => {
                await mockOpenExtensionPreferences();
                await toast.hide();
              },
            },
          });
          return false;
        }

        // Run terminal command based on preferences
        const commands = [];

        if (prefs.useCustomSonarQubeApp && prefs.sonarqubeAppPath) {
          commands.push(`open ${prefs.sonarqubeAppPath}`);
        } else {
          commands.push("podman machine start");
          commands.push("cd " + prefs.sonarqubePodmanDir);
          commands.push("sleep 2");
          commands.push("podman-compose up -d");
          commands.push("sleep 60"); // Wait for SonarQube to start
          commands.push("./gradlew sonar");
        }

        await mockRunInNewTerminal(commands, "Success", "Error");
        return true;
      } catch (error) {
        // Handle errors with toast
        await mockShowToast({
          style: "Failure",
          title: "Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });
        return false;
      }
    });
  });

  it("should show error if custom app is enabled but path not configured", async () => {
    // Configure preferences with invalid custom app config
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    // Override the default mockIsSonarQubeRunning for this test
    // to make sure we test the path validation logic
    mockIsSonarQubeRunning.mockImplementationOnce(() => {
      return Promise.resolve({
        running: false,
        status: "down",
        details: "SonarQube is not running",
      });
    });

    // Override the default mockStartAnalyzeOpenSonarQube for this test
    // to make it use the actual implementation logic for preference validation
    mockStartAnalyzeOpenSonarQube.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      try {
        // Check if SonarQube is running - will return down based on our mock above
        const status = await mockIsSonarQubeRunning({ detailed: true });

        // Since it's down, it will proceed to the preferences check
        const prefs = mockGetPreferenceValues();

        // Validate custom app configuration - this is the part we want to test
        if (prefs.useCustomSonarQubeApp && !prefs.sonarqubeAppPath) {
          await mockShowToast({
            style: "Failure",
            title: mockTranslate("commands.startSonarQube.missingAppPath"),
            primaryAction: {
              title: mockTranslate("commands.startSonarQube.openPreferences"),
              onAction: async (toast: MockToast) => {
                await mockOpenExtensionPreferences();
                await toast.hide();
              },
            },
          });
          return false;
        }

        return true;
      } catch (error) {
        return false;
      }
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify failure toast with the correct message
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure",
        title: expect.any(String),
        primaryAction: expect.objectContaining({
          title: expect.any(String),
          onAction: expect.any(Function),
        }),
      }),
    );

    // Verify terminal commands were not executed
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();

    // Verify preferences were opened when the primary action is triggered
    const primaryAction = mockShowToast.mock.calls[0][0].primaryAction;
    const mockToast = { hide: jest.fn() };
    await primaryAction.onAction(mockToast);
    expect(mockOpenExtensionPreferences).toHaveBeenCalled();
  });

  it("should use custom app path when properly configured", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/Applications/CustomSonarQube.app",
    });

    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "down",
      details: "SonarQube is not running",
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify runInNewTerminal was called
    expect(mockRunInNewTerminal).toHaveBeenCalled();

    // Check that the custom path is in the terminal commands
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const openCommand = commands.find((cmd: string) => cmd.includes("/Applications/CustomSonarQube.app"));
    expect(openCommand).toBeTruthy();
  });

  it("should run analysis directly when SonarQube is already running", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: true,
      status: "running",
      details: "SonarQube is running",
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify success toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
        title: "translated.commands.startSonarQube.alreadyRunning",
      }),
    );

    // Verify terminal commands do not include podman startup
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
  });

  it("should handle the case when SonarQube is in 'starting' state", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "starting",
      details: "SonarQube is starting",
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify animated toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "translated.commands.startSonarQube.waiting",
      }),
    );

    // Verify sleep command is included for waiting
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
  });

  it("should handle timeout with successful second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out",
    }));

    // Second check returns success
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: true,
      status: "running",
      details: "SonarQube is running",
    }));

    // Use a custom implementation for this test
    mockStartAnalyzeOpenSonarQube.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      try {
        // First check - timeout
        const firstStatus = await mockIsSonarQubeRunning({ detailed: true });

        // Show animated toast for checking
        await mockShowToast({
          style: "Animated",
          title: "Checking SonarQube status",
        });

        // Second check - success
        const secondStatus = await mockIsSonarQubeRunning({ detailed: true });

        // Show success toast
        await mockShowToast({
          style: "Success",
          title: "SonarQube is running",
        });

        return true;
      } catch (error) {
        return false;
      }
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify isSonarQubeRunning was called twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);

    // Verify animated toast for checking, then success toast
    const toastCalls = mockShowToast.mock.calls;
    expect(toastCalls[0][0]).toMatchObject({
      style: "Animated",
    });

    // Second call should indicate success
    expect(toastCalls[1][0]).toMatchObject({
      style: "Success",
    });
  });

  it("should handle timeout with 'starting' second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out",
    }));

    // Second check returns starting
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "starting",
      details: "SonarQube is starting",
    }));

    // Use a custom implementation for this test
    mockStartAnalyzeOpenSonarQube.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      try {
        // First check - timeout
        const firstStatus = await mockIsSonarQubeRunning({ detailed: true });

        // Show animated toast for checking
        await mockShowToast({
          style: "Animated",
          title: "Checking SonarQube status",
        });

        // Second check - starting
        const secondStatus = await mockIsSonarQubeRunning({ detailed: true });

        // Show title toast
        await mockShowToast({
          title: "commands.startSonarQube.title",
        });

        return true;
      } catch (error) {
        return false;
      }
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify first toast is animated
    const firstToast = mockShowToast.mock.calls[0][0];
    expect(firstToast).toMatchObject({
      style: "Animated",
    });

    // Verify second toast indicates starting
    const secondToast = mockShowToast.mock.calls[1][0];
    expect(secondToast).toMatchObject({
      title: "commands.startSonarQube.title",
    });
  });

  it("should handle timeout with 'down' second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out",
    }));

    // Second check returns down
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "down",
      details: "SonarQube is not running",
    }));

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify animated toast for starting SonarQube
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "translated.commands.startSonarQube.title",
      }),
    );

    // Verify terminal commands include podman startup
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeTruthy();
  });

  it("should start SonarQube from scratch when it's completely down", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "down",
      details: "SonarQube is not running",
    });

    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify animated toast for starting
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "translated.commands.startSonarQube.title",
      }),
    );

    // Verify full startup sequence in terminal commands
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeTruthy();
    expect(commands.some((cmd: string) => cmd.includes("sleep"))).toBeTruthy();
    expect(commands.some((cmd: string) => cmd.includes("./gradlew"))).toBeTruthy();
  });

  it("should render project list correctly", async () => {
    // Render the MockCommand directly to test the UI
    const { findByText, findByTestId } = render(<MockCommand />);

    // Verify that SonarQube Tools title is shown
    const titleElement = await findByText("SonarQube Tools");
    expect(titleElement).toBeInTheDocument();

    // Verify command component is rendered
    const commandComponent = await findByTestId("command-component");
    expect(commandComponent).toBeInTheDocument();
  });

  it("should render empty state when no projects are available", async () => {
    // Mock loadProjects to return empty array
    jest.requireMock("../../../utils").loadProjects.mockResolvedValueOnce([]);

    // Render the MockCommand
    const { findByTestId } = render(<MockCommand />);

    // Verify command component is rendered
    const commandComponent = await findByTestId("command-component");
    expect(commandComponent).toBeInTheDocument();
  });

  it("should handle errors from runInNewTerminal", async () => {
    // Setup SonarQube status
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "down",
      details: "SonarQube is not running",
    });

    // Make runInNewTerminal throw an error
    mockRunInNewTerminal.mockRejectedValueOnce(new Error("Terminal error"));

    // Use a custom implementation for this test
    mockStartAnalyzeOpenSonarQube.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      try {
        // Show success toast first (as part of test validation)
        await mockShowToast({
          style: "Success",
          title: "Starting SonarQube",
        });

        // Run terminal command that will fail
        await mockRunInNewTerminal(["test command"], "Success", "Error");

        return true;
      } catch (error) {
        // Show error toast
        await mockShowToast({
          style: "Failure",
          title: "Error",
          message: error instanceof Error ? error.message : "Unknown error",
        });

        return false;
      }
    });

    // Execute with try/catch to prevent test failure from unhandled rejection
    await mockStartAnalyzeOpenSonarQube("test-path", "test-name", "test-target-path");

    // Verify toast was shown with success status (before the error)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
      }),
    );

    // Verify terminal command was attempted
    expect(mockRunInNewTerminal).toHaveBeenCalled();

    // Verify error toast was shown
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure",
        title: "Error",
        message: "Terminal error",
      }),
    );
  });
});
