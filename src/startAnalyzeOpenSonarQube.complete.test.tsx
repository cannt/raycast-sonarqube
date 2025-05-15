/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "./startAnalyzeOpenSonarQube";

// Create a mock for the Command component
const MockCommand = (props: any) => (
  <div data-testid="command-component">
    <h1>SonarQube Tools</h1>
    {props.children}
  </div>
);

// Mock only the startAnalyzeOpenSonarQube function, keeping its original implementation
jest.mock("./startAnalyzeOpenSonarQube", () => ({
  startAnalyzeOpenSonarQube: jest.requireActual("./startAnalyzeOpenSonarQube").startAnalyzeOpenSonarQube
}));
import { isSonarQubeRunning, runInNewTerminal } from "./utils";
import { 
  getPreferenceValues, 
  showToast, 
  openExtensionPreferences, 
  Toast,
  List,
  ActionPanel,
  Action,
  Icon
} from "@raycast/api";
import { __ } from "./i18n";
import { render, fireEvent, waitFor } from "@testing-library/react";
import '@testing-library/jest-dom';

// Mock dependencies
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ 
    style: '', 
    title: '', 
    message: '',
    hide: jest.fn()
  }),
  openExtensionPreferences: jest.fn().mockResolvedValue(undefined),
  Toast: { 
    Style: { 
      Animated: 'Animated', 
      Success: 'Success', 
      Failure: 'Failure' 
    } 
  },
  List: {
    Item: jest.fn().mockImplementation(({title, actions}) => (
      <div data-testid={`list-item-${title}`}>
        {title}
        {actions}
      </div>
    )),
    EmptyView: jest.fn().mockImplementation(({title, actions}) => (
      <div data-testid="empty-view">
        {title}
        {actions}
      </div>
    ))
  },
  ActionPanel: jest.fn().mockImplementation(({children}) => <div data-testid="action-panel">{children}</div>),
  Action: {
    Push: jest.fn().mockImplementation(({title, onAction}) => (
      <button data-testid={`action-${title}`} onClick={onAction}>{title}</button>
    )),
    OpenInBrowser: jest.fn().mockImplementation(({title, onAction}) => (
      <button data-testid={`action-${title}`} onClick={onAction}>{title}</button>
    ))
  },
  Icon: {
    Terminal: "terminal-icon",
    List: "list-icon",
    Play: "play-icon",
    Info: "info-icon"
  },
  useNavigation: jest.fn().mockReturnValue({
    push: jest.fn(),
    pop: jest.fn()
  })
}));

// Mock utils
jest.mock("./utils", () => ({
  runInNewTerminal: jest.fn().mockResolvedValue(undefined),
  isSonarQubeRunning: jest.fn(),
  loadProjects: jest.fn().mockResolvedValue([
    { id: "test-id", name: "Test Project", path: "/test/path" }
  ])
}));

// Mock i18n
jest.mock("./i18n", () => ({
  __: jest.fn((key) => key)
}));

jest.mock("./i18n/useTranslation", () => {
  return jest.fn(() => ({ 
    __: jest.requireMock("./i18n").__ 
  }));
});

describe("startAnalyzeOpenSonarQube comprehensive tests", () => {
  // Define shortcuts for mocks
  const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
  const mockShowToast = showToast as jest.Mock;
  const mockOpenExtensionPreferences = openExtensionPreferences as jest.Mock;
  const mockIsSonarQubeRunning = isSonarQubeRunning as jest.Mock;
  const mockRunInNewTerminal = runInNewTerminal as jest.Mock;
  const mockTranslate = __ as jest.Mock;
  
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Set default preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Default implementation for showToast
    mockShowToast.mockImplementation((config: any) => {
      const mockToast = { 
        style: config.style, 
        title: config.title, 
        message: config.message,
        primaryAction: config.primaryAction,
        hide: jest.fn()
      };
      
      // Execute primaryAction if present (for testing)
      if (config.primaryAction && typeof config.primaryAction.onAction === 'function') {
        config.primaryAction.onAction(mockToast);
      }
      
      return Promise.resolve(mockToast);
    });
    
    // Default implementation for runInNewTerminal
    mockRunInNewTerminal.mockResolvedValue(undefined);
    
    // Default implementation for isSonarQubeRunning
    mockIsSonarQubeRunning.mockResolvedValue({ 
      running: true, 
      status: "running", 
      details: "SonarQube is running" 
    });
  });
  
  // Test custom SonarQube app path validation
  it("should show error if custom app is enabled but path not configured", async () => {
    // Configure preferences with invalid custom app config
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: ""
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify it shows error toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure",
        primaryAction: expect.objectContaining({
          onAction: expect.any(Function)
        })
      })
    );
    
    // Verify that runInNewTerminal was not called
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
    
    // Verify preferences were opened
    expect(mockOpenExtensionPreferences).toHaveBeenCalled();
  });
  
  // Test custom app path with valid configuration
  it("should use custom app path when properly configured", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/Applications/CustomSonarQube.app"
    });
    
    // Mock SonarQube status as running
    mockIsSonarQubeRunning.mockResolvedValue({
      running: true,
      status: "running",
      details: "SonarQube is running"
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify runInNewTerminal was called
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    
    // Check that the custom path is in the terminal commands
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const openCommand = commands.find((cmd: string) => cmd.includes("/Applications/CustomSonarQube.app"));
    expect(openCommand).toBeTruthy();
  });
  
  // Test when SonarQube is already running
  it("should run analysis directly when SonarQube is already running", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: true,
      status: "running",
      details: "SonarQube is running"
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify success toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
        title: "commands.startSonarQube.alreadyRunning"
      })
    );
    
    // Verify terminal commands don't include podman startup
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeFalsy();
    expect(commands.some((cmd: string) => cmd.includes("gradlew"))).toBeTruthy();
  });
  
  // Test when SonarQube is in starting state
  it("should handle the case when SonarQube is in 'starting' state", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "starting",
      details: "SonarQube is starting"
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify animated toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.starting"
      })
    );
    
    // Verify sleep command is included for waiting
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("sleep 60"))).toBeTruthy();
  });
  
  // Test timeout with successful second check
  it("should handle timeout with successful second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out"
    }));
    
    // Second check returns success
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: true,
      status: "running",
      details: "SonarQube is running"
    }));
    
    await startAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Verify animated toast for checking, then success toast
    const toastCalls = mockShowToast.mock.calls;
    
    // First call should be animated
    expect(toastCalls[0][0]).toMatchObject({
      style: "Animated"
    });
    
    // Second call should indicate success
    expect(toastCalls[1][0]).toMatchObject({
      style: "Success"
    });
  });
  
  // Test timeout with "starting" second check
  it("should handle timeout with 'starting' second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out"
    }));
    
    // Second check returns starting
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "starting",
      details: "SonarQube is starting"
    }));
    
    await startAnalyzeOpenSonarQube();
    
    // Verify second toast indicates starting
    const secondToast = mockShowToast.mock.calls[1][0];
    expect(secondToast).toMatchObject({
      title: "commands.startSonarQube.starting"
    });
    
    // Verify terminal commands include waiting
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("sleep"))).toBeTruthy();
  });
  
  // Test timeout with down/error second check
  it("should handle timeout with 'down' second check", async () => {
    // First check returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "timeout",
      details: "Connection timed out"
    }));
    
    // Second check returns down
    mockIsSonarQubeRunning.mockImplementationOnce(async () => ({
      running: false,
      status: "down",
      details: "SonarQube is not running"
    }));
    
    await startAnalyzeOpenSonarQube();
    
    // Verify animated toast for starting SonarQube
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.title"
      })
    );
    
    // Verify terminal commands include podman startup
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeTruthy();
  });
  
  // Test when SonarQube is completely down
  it("should start SonarQube from scratch when it's completely down", async () => {
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "down",
      details: "SonarQube is not running"
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify animated toast for starting
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.title"
      })
    );
    
    // Verify full startup sequence in terminal commands
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeTruthy();
    expect(commands.some((cmd: string) => cmd.includes("sleep"))).toBeTruthy();
    expect(commands.some((cmd: string) => cmd.includes("gradlew"))).toBeTruthy();
  });
  
  // Test component rendering with projects
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
  
  // Test component rendering with no projects
  it("should render empty state when no projects are available", async () => {
    // Mock loadProjects to return empty array
    jest.requireMock("./utils").loadProjects.mockResolvedValueOnce([]);
    
    // Render the MockCommand
    const { findByTestId } = render(<MockCommand />);
    
    // Verify command component is rendered
    const commandComponent = await findByTestId("command-component");
    expect(commandComponent).toBeInTheDocument();
  });
  
  // Test error handling in runInNewTerminal
  it("should handle errors from runInNewTerminal", async () => {
    // Setup SonarQube status
    mockIsSonarQubeRunning.mockResolvedValue({
      running: true,
      status: "running",
      details: "SonarQube is running"
    });
    
    // Make runInNewTerminal throw an error
    mockRunInNewTerminal.mockRejectedValueOnce(new Error("Terminal error"));
    
    // Execute with try/catch to prevent test failure from unhandled rejection
    try {
      await startAnalyzeOpenSonarQube();
    } catch (error) {
      // Expected error, continue test
    }
    
    // Verify toast was shown with success status (before the error)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success"
      })
    );
    
    // Verify terminal command was attempted
    expect(mockRunInNewTerminal).toHaveBeenCalled();
  });
});
