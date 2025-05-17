/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "../../../commands/startAnalyzeOpenSonarQube";
import * as React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// TypeScript definitions for mocked components
type MockedComponent = {
  title?: string;
  actions?: React.ReactNode;
  subtitle?: string;
  description?: string;
  icon?: string;
  children?: React.ReactNode;
  target?: React.ReactNode;
  onAction?: () => void;
  key?: string;
};

// Mock translations to return the key for easier testing
jest.mock("../../../i18n", () => ({
  __: jest.fn((key: string) => key),
}));

jest.mock("../../../i18n/useTranslation", () => {
  return jest.fn(() => ({
    __: jest.fn((key: string) => key),
  }));
});

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: '', title: '', message: '' }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
  openExtensionPreferences: jest.fn(),
  useNavigation: jest.fn(() => ({
    push: jest.fn(),
  })),
  List: {
    Item: ({ title, actions, subtitle }: MockedComponent) => (<div data-testid="list-item">{title}{subtitle}{actions}</div>),
    EmptyView: ({ title, description, actions }: MockedComponent) => (<div data-testid="empty-view">{title}{description}{actions}</div>),
  },
  ActionPanel: ({ children }: MockedComponent) => (<div data-testid="action-panel">{children}</div>),
  Action: {
    Push: ({ title, target }: MockedComponent) => (<button data-testid="action-push">{title}</button>),
  },
  Icon: {
    Play: "play-icon", 
    Terminal: "terminal-icon",
    List: "list-icon",
    Info: "info-icon"
  }
}));

jest.mock("../../../utils", () => ({
  runInNewTerminal: jest.fn(),
  isSonarQubeRunning: jest.fn(),
  loadProjects: jest.fn(),
  Project: class Project {
    id: string;
    name: string;
    path: string;
    constructor(id: string, name: string, path: string) {
      this.id = id;
      this.name = name;
      this.path = path;
    }
  }
}));

const { getPreferenceValues, showToast, openExtensionPreferences } = require("@raycast/api");
const { runInNewTerminal, isSonarQubeRunning, loadProjects, Project } = require("../../../utils");

describe("startAnalyzeOpenSonarQube", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows error if custom path required but not set", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "", sonarqubePodmanDir: "/podman", rfidProjectDir: "/rfid" });
    await startAnalyzeOpenSonarQube();
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({ style: "Failure", title: expect.any(String) })
    );
    expect(runInNewTerminal).not.toHaveBeenCalled();
  });

  it("runs full sequence if SonarQube not running and custom path set", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: true, sonarqubeAppPath: "http://custom.sonar", sonarqubePodmanDir: "/podman", rfidProjectDir: "/rfid" });
    
    // Mock detailed response for enhanced isSonarQubeRunning function
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      // Return detailed object if detailed flag is set, otherwise return boolean for backward compatibility
      if (options && options.detailed) {
        return { running: false, status: "stopped", details: "SonarQube is not running" };
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    // With our i18n implementation, check only that the call was made
    expect(runInNewTerminal).toHaveBeenCalled();
    
    // Verify the specific commands needed are included
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    
    // Check that commands include required sequences
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    const cdCommand = commands.find((cmd: string) => cmd.includes("cd \"/rfid\""));
    
    expect(podmanStartCommand).toBeTruthy();
    expect(cdCommand).toBeTruthy();
  });

  it("skips podman start if SonarQube already running", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false, sonarqubePodmanDir: "/podman", rfidProjectDir: "/rfid" });
    
    // Mock detailed response for enhanced isSonarQubeRunning function
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      // Return detailed object if detailed flag is set, otherwise return boolean for backward compatibility
      if (options && options.detailed) {
        return { running: true, status: "running", details: "SonarQube is running properly" };
      }
      return true;
    });
    
    await startAnalyzeOpenSonarQube();
    // With our i18n implementation, check only that the call was made
    expect(runInNewTerminal).toHaveBeenCalled();
    
    // Verify the specific commands needed are included
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    
    // Check that commands do NOT include podman start
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    
    // Should find the cd command but NOT the podman start command
    expect(podmanStartCommand).toBeFalsy();
    expect(commands.find((cmd: string) => cmd.includes("cd \"/rfid\""))).toBeTruthy();
  });
  
  it("sets longer wait time when SonarQube is starting", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false, sonarqubePodmanDir: "/podman", rfidProjectDir: "/rfid" });
    
    // Mock SonarQube in 'starting' state
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      if (options && options.detailed) {
        return { running: false, status: "starting", details: "SonarQube is initializing" };
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    expect(runInNewTerminal).toHaveBeenCalled();
    
    // Get the commands to check for sleep duration
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    
    // Should have a longer sleep command and NOT include podman start
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    const sleepCommand = commands.find((cmd: string) => cmd.includes("sleep"));
    
    expect(podmanStartCommand).toBeFalsy(); // No need to start Podman
    expect(sleepCommand).toBeTruthy(); // Should have a sleep command
    expect(sleepCommand).toMatch(/sleep (45|60)/); // Should be a longer wait (45 or 60 seconds)
  });
  
  it("performs additional check with longer timeout when initial request times out", async () => {
    getPreferenceValues.mockReturnValue({ useCustomSonarQubeApp: false, sonarqubePodmanDir: "/podman", rfidProjectDir: "/rfid" });
    
    // Mock isSonarQubeRunning to first return timeout, then running=true on second call with longer timeout
    let callCount = 0;
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      callCount++;
      // First call with detailed=true returns timeout
      if (options && options.detailed) {
        // First call (status check)
        if (callCount === 1) {
          return { running: false, status: "timeout", details: "Connection timed out" };
        }
        // Second call (retry with longer timeout)
        else if (callCount === 2) {
          return { running: true, status: "running", details: "Connected after retry with longer timeout" };
        }
      }
      return false;
    });
    
    await startAnalyzeOpenSonarQube();
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2); // Should be called twice
    expect(runInNewTerminal).toHaveBeenCalled();
    
    // Get the commands
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    
    // Should NOT include podman start since SonarQube is actually running
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
});

// Additional test scenarios for startAnalyzeOpenSonarQube function
describe("startAnalyzeOpenSonarQube additional scenarios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("handles SonarQube status as 'unknown'", async () => {
    // Setup preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Mock SonarQube in unknown state
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "unknown", details: "Status unknown" };
      }
      return false;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify toast was shown with animated style
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Animated"
    }));
    
    // Verify SonarQube is started from scratch
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    
    expect(commands.some((cmd: string) => cmd.includes("podman machine start"))).toBeTruthy();
  });
  
  it("uses default SonarQube URL when custom app not enabled", async () => {
    // Setup preferences without custom app path
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Mock SonarQube running status
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify commands use default URL
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    
    // The open command will be a string like: open "http://localhost:9000"
    // Join all commands to make searching easier
    const allCommands = commands.join(" ");
    
    // Check that the default URL is used somewhere in the commands
    expect(allCommands).toContain("http://localhost:9000");
  });
  
  it("uses proper environment variable for test environment", async () => {
    // Setup preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/custom/test/path"
    });
    
    // Set test environment
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';
    
    try {
      // Mock SonarQube running status
      isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
        if (options?.detailed) {
          return { running: true, status: "running", details: "SonarQube is running" };
        }
        return true;
      });
      
      // Call the function
      await startAnalyzeOpenSonarQube();
      
      // Verify path used in test mode
      const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
      const commands = runInNewTerminalArgs[0];
      
      // For test environment, it should use the /rfid path not the custom path
      const cdCommand = commands.find((cmd: string) => cmd.includes("cd \"/rfid\""));
      expect(cdCommand).toBeTruthy();
    } finally {
      // Restore environment
      process.env.NODE_ENV = originalEnv;
    }
  });
  
  it("includes appropriate wait time based on SonarQube status", async () => {
    // Setup preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Mock SonarQube in starting state
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "starting", details: "SonarQube is starting" };
      }
      return false;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify commands include appropriate sleep duration based on status
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    const sleepCommand = commands.find((cmd: string) => cmd.includes("sleep"));
    
    // For 'starting' status, it should have a longer wait time
    expect(sleepCommand).toMatch(/sleep (45|60)/);  
  });

  it("handles SonarQube starting state correctly when in starting state", async () => {
    // Mock preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Mock SonarQube in starting state
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "starting", details: "SonarQube is starting" };
      }
      return false;
    });
    
    // Call the main function directly
    await startAnalyzeOpenSonarQube();
    
    // Verify toast showing "starting" status
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.starting"
      })
    );
    
    // Verify terminal commands for starting state
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    
    // Should include a sleep command with longer wait
    const sleepCommand = commands.find((cmd: string) => cmd.includes("sleep"));
    expect(sleepCommand).toBeTruthy();
    expect(sleepCommand).toMatch(/sleep (45|60)/);
  });
  
  it("handles timeout state with second successful check", async () => {
    // Mock preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // First call returns timeout, second call returns running
    isSonarQubeRunning.mockImplementationOnce(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    }).mockImplementationOnce(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    // Call the main function directly
    await startAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called twice
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Verify the second call had a longer timeout
    expect(isSonarQubeRunning.mock.calls[1][0].timeout).toBeGreaterThan(1000);
    
    // Verify that we didn't try to start SonarQube again since it's running
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
  
  it("handles timeout state with second timeout check", async () => {
    // Mock preferences
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Both calls return timeout
    isSonarQubeRunning.mockImplementationOnce(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    }).mockImplementationOnce(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out again" };
      }
      return false;
    });
    
    // Call the main function directly
    await startAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called twice
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Verify that we tried to start SonarQube since both checks failed
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeTruthy();
  });

  it("uses custom path from preferences when available", async () => {
    // Mock preferences with custom path
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/custom/path/to/sonarqube.app",
      sonarqubePodmanDir: "/sonarqube",
      rfidProjectDir: "/path/to/test"
    });
    
    // Mock SonarQube status
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    // Call the main function 
    await startAnalyzeOpenSonarQube();
    
    // Verify runInNewTerminal was called with commands containing the custom path
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    const openCommand = commands.find((cmd: string) => cmd.includes("open"));
    
    // Verify the custom path is used somewhere in the commands
    const allCommands = commands.join(" ");
    expect(allCommands).toContain("/custom/path/to/sonarqube.app");
  });

  it("shows error toast when custom path is enabled but empty", async () => {
    // Mock preferences with custom path enabled but empty
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
      sonarqubePodmanDir: "/sonarqube",
    });
    
    // Call the main function
    await startAnalyzeOpenSonarQube();
    
    // Verify error toast was shown
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ 
      style: "Failure", 
      title: "preferences.useCustomSonarQubeApp.title" 
    }));
    
    // Verify runInNewTerminal was not called since we showed an error
    expect(runInNewTerminal).not.toHaveBeenCalled();
  });
});

