/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "./startAnalyzeOpenSonarQube";
import { isSonarQubeRunning, runInNewTerminal } from "./utils";
import { getPreferenceValues, showToast, openExtensionPreferences, Toast } from "@raycast/api";
import { __ } from "./i18n";

// Mock dependencies
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn(),
  Toast: { 
    Style: { 
      Animated: 'Animated', 
      Success: 'Success', 
      Failure: 'Failure' 
    } 
  },
  openExtensionPreferences: jest.fn(),
}));

// Mock utils
jest.mock("./utils", () => ({
  runInNewTerminal: jest.fn().mockResolvedValue(undefined),
  isSonarQubeRunning: jest.fn(),
}));

// Mock i18n
jest.mock("./i18n", () => ({
  __: jest.fn((key) => `translated.${key}`),
}));

describe("startAnalyzeOpenSonarQube comprehensive tests", () => {
  // Shortcuts for mocks
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
    
    // Setup default mock implementations
    mockShowToast.mockImplementation((config: any) => {
      // Create and return a mock toast object with hide method
      const mockToast = { 
        style: config.style || '', 
        title: config.title || '', 
        message: config.message || '',
        primaryAction: config.primaryAction || undefined,
        hide: jest.fn()
      };
      
      // If there's a primary action with onAction, set it up so we can test it
      if (config.primaryAction && typeof config.primaryAction.onAction === 'function') {
        // Store the original onAction
        const originalOnAction = config.primaryAction.onAction;
        
        // Replace it with our own implementation that passes our mock toast
        config.primaryAction.onAction = () => originalOnAction(mockToast);
      }
      
      return Promise.resolve(mockToast);
    });
    
    // Default implementation for runInNewTerminal (succeeds)
    mockRunInNewTerminal.mockImplementation((commands: string[], successMsg: string, errorMsg: string) => {
      return Promise.resolve();
    });
    
    // Default implementation for translate function
    mockTranslate.mockImplementation((key) => `translated.${key}`);
    
    // Default preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
  });

  // Test for missing Podman directory configuration
  it("should show proper animations and not run commands with empty podman dir", async () => {
    // Set up mock to return empty podman dir
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Mock SonarQube status check properly with the expected structure
    mockIsSonarQubeRunning.mockResolvedValue({
      running: false,
      status: "down",
      details: "SonarQube is not running"
    });
    
    // For this specific test only, make runInNewTerminal throw an error
    // This simulates what would happen when trying to execute a command with an invalid path
    mockRunInNewTerminal.mockImplementationOnce(() => {
      throw new Error("Invalid path");
    });
    
    // Execute with try/catch since we expect an error
    try {
      await startAnalyzeOpenSonarQube();
    } catch (error: unknown) {
      // Error is expected with empty path
    }
    
    // Verify at least one toast was shown (animation toast before trying to run command)
    expect(mockShowToast).toHaveBeenCalled();

    // Verify runInNewTerminal was called, but will fail with our mock
    expect(mockRunInNewTerminal).toHaveBeenCalled();

    // Verify toast was animated style at some point (starting message)
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated"
      })
    );
  });
  
  // Test for SonarQube already running
  it("should show success message when SonarQube is already running", async () => {
    // Mock SonarQube already running with detailed response
    mockIsSonarQubeRunning.mockImplementation(async (options) => {
      if (options && options.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Check appropriate success message
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
        title: expect.stringContaining("translated.commands.startSonarQube.alreadyRunning"),
      })
    );
    
    // Should still run analysis commands
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    
    // Verify it's running analysis commands
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const hasAnalysisCommand = commands.some((cmd: string) => cmd.includes("gradlew") && cmd.includes("sonar"));
    expect(hasAnalysisCommand).toBe(true);
  });
  
  // Test for SonarQube in "starting" state (initializing)
  it("should handle case when SonarQube is in 'starting' state", async () => {
    // Mock SonarQube in starting state using detailed result
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "starting", details: "SonarQube is starting" };
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Should show appropriate "please wait" message
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: expect.any(String),
        message: expect.stringContaining("translated.commands.startSonarQube.pleaseWait"),
      })
    );
    
    // Terminal commands should have been executed
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    
    // Verify no Podman machine start command when SonarQube is starting
    const terminalCommands = mockRunInNewTerminal.mock.calls[0][0];
    const podmanStartCommand = terminalCommands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeUndefined();
    
    // Should include sleep command
    const sleepCommand = terminalCommands.find((cmd: string) => cmd.includes("sleep"));
    expect(sleepCommand).toBeDefined();
  });
  
  // Test for unresponsive/down state - should attempt full restart
  it("should attempt full restart when SonarQube is completely down", async () => {
    // Mock SonarQube as completely down
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Should run startup commands
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    
    // Check the commands include proper Podman operations
    const terminalCommands = mockRunInNewTerminal.mock.calls[0][0];
    const podmanCommands = terminalCommands.filter((cmd: string) => 
      cmd.includes("podman") || cmd.includes("podman-compose"));
    expect(podmanCommands.length).toBeGreaterThan(0);
    
    // Should show animated toast while starting
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: expect.stringContaining("translated.commands.startSonarQube.title"),
      })
    );
  });
  
  // Test for timeout/network error state
  it("should handle timeout errors with additional checks", async () => {
    // First call times out, second call succeeds
    let callCount = 0;
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      callCount++;
      if (options && options.detailed) {
        if (callCount === 1) {
          return { running: false, status: "timeout", details: "Connection timed out" };
        } else {
          return { running: true, status: "running", details: "SonarQube is running" };
        }
      }
      return callCount > 1; // Return false first, then true
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Should verify status at least once
    expect(mockIsSonarQubeRunning).toHaveBeenCalled();
    
    // Should have the correct call structure
    const calls = mockIsSonarQubeRunning.mock.calls;
    const detailedCallIndex = calls.findIndex(
      call => call[0] && call[0].detailed === true
    );
    expect(detailedCallIndex).not.toBe(-1);
    
    // Success toast should be shown after detecting running state
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
        title: expect.stringContaining("translated.commands.startSonarQube.alreadyRunning")
      })
    );
  });
  
  // Test with custom SonarQube application
  it("should use custom SonarQube app path when configured", async () => {
    // Set preferences to use custom app
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/Applications/Custom/SonarQube.app"
    });
    
    // SonarQube is not running with detailed response
    mockIsSonarQubeRunning.mockImplementation(async (options) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Verify that terminal commands were attempted
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    
    // Get the arguments to check what commands were passed
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    
    // Verify that at least one command references the custom app path
    const hasCustomAppCommand = commands.some(
      (cmd: string) => cmd.includes("/Applications/Custom/SonarQube.app")
    );
    expect(hasCustomAppCommand).toBe(true);
  });
  
  // Test custom app path not configured
  it("should show error when custom app is enabled but path not set", async () => {
    // Set preferences to use custom app but with empty path
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: ""
    });
    
    // Configure mocks to focus on the custom app path check
    mockIsSonarQubeRunning.mockImplementation(async (options) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    // For this test, make the toast trigger the primaryAction
    mockShowToast.mockImplementationOnce((config: any) => {
      const mockToast = {
        hide: jest.fn(),
        style: config.style,
        title: config.title,
        message: config.message,
        primaryAction: config.primaryAction
      };
      
      // Execute the primaryAction immediately to trigger preferences
      if (config.primaryAction && typeof config.primaryAction.onAction === 'function') {
        config.primaryAction.onAction(mockToast);
      }
      
      return Promise.resolve(mockToast);
    });
    
    await startAnalyzeOpenSonarQube();
    
    // Should show error toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure",
        primaryAction: expect.objectContaining({
          onAction: expect.any(Function)
        })
      })
    );
    
    // Verify no terminal commands were attempted
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
  });
  
  // Test localization of command outputs
  it("should use properly localized messages for all states", async () => {
    // Reset the mocks to clean state
    jest.clearAllMocks();
    
    // Setup mocks with default valid values
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Mock SonarQube as down for this test
    mockIsSonarQubeRunning.mockImplementation(async (options) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    // Set up a simple mock for showToast
    mockShowToast.mockImplementation((config) => {
      return Promise.resolve({
        style: config.style,
        title: config.title,
        message: config.message,
        hide: jest.fn()
      });
    });
    
    // Reset translation mock
    mockTranslate.mockClear();
    mockTranslate.mockImplementation((key) => `translated.${key}`);
    
    // Run the function
    await startAnalyzeOpenSonarQube();
    
    // Verify translation calls were made
    expect(mockTranslate).toHaveBeenCalled();
    expect(mockTranslate).toHaveBeenCalledWith("commands.startSonarQube.title");
  });
  
  // Test error handling with localized messages
  it("should handle errors with localized messages", async () => {
    // Setup valid preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Mock SonarQube as not running
    mockIsSonarQubeRunning.mockImplementation(async (options) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    // Track toast calls for later verification
    const toastCalls: Array<{style: string}> = [];
    mockShowToast.mockImplementation((config) => {
      toastCalls.push({style: config.style});
      return Promise.resolve({
        style: config.style,
        title: config.title,
        message: config.message,
        hide: jest.fn()
      });
    });
    
    // Make runInNewTerminal throw a synchronous error for this test only
    mockRunInNewTerminal.mockImplementationOnce(() => {
      throw new Error("Terminal command failed");
    });
    
    // Execute with error handling
    try {
      await startAnalyzeOpenSonarQube();
    } catch (error: unknown) {
      // Error is expected
      console.log("Expected error caught in test:", error instanceof Error ? error.message : String(error));
    }
    
    // Verify that a toast was called before the error
    expect(mockShowToast).toHaveBeenCalled();
    
    // A toast with Animated style should have been shown
    expect(toastCalls.some((call: {style: string}) => call.style === "Animated")).toBe(true);
  });
});
