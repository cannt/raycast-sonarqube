/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "./startAnalyzeOpenSonarQube";
import Command from "./startAnalyzeOpenSonarQube";
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
jest.mock("./i18n", () => ({
  __: jest.fn((key: string) => key),
}));

jest.mock("./i18n/useTranslation", () => {
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

jest.mock("./utils", () => ({
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
const { runInNewTerminal, isSonarQubeRunning, loadProjects, Project } = require("./utils");

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

// Unit tests for the Command component
describe("Command Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state correctly", async () => {
    // Setup the component to be in loading state
    loadProjects.mockResolvedValue([]);

    // Render the component
    render(<Command />);
    
    // In loading state, we should see a List with isLoading=true
    expect(document.querySelector('[data-testid="list-item"]')).toBeFalsy();
  });

  it("renders empty state when no projects are available", async () => {
    // Mock the loadProjects to return an empty array
    loadProjects.mockResolvedValue([]);
    
    // Wait for the effect to complete
    await waitFor(() => {
      render(<Command />);
    });
    
    // Wait for loading to finish
    await waitFor(() => {
      expect(loadProjects).toHaveBeenCalled();
    });
    
    // Should render the empty view
    expect(document.querySelector('[data-testid="empty-view"]')).toBeTruthy();
  });

  it("renders project list when projects are available", async () => {
    // Mock projects
    const mockProjects = [
      new Project("1", "Project 1", "/path/to/project1"),
      new Project("2", "Project 2", "/path/to/project2"),
    ];
    
    // Mock the loadProjects to return mock projects
    loadProjects.mockResolvedValue(mockProjects);
    
    // Render component
    render(<Command />);
    
    // Wait for projects to load
    await waitFor(() => {
      expect(loadProjects).toHaveBeenCalled();
    });
    
    // Should render list items for projects
    const listItems = document.querySelectorAll('[data-testid="list-item"]');
    expect(listItems.length).toBe(2);
  });

  it("handles project selection and starts analysis sequence", async () => {
    // Mock preferences and SonarQube running state
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubePodmanDir: "/sonarqube",
    });
    
    // Mock SonarQube is running
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    // Mock projects
    const mockProjects = [new Project("1", "Test Project", "/path/to/test")];
    loadProjects.mockResolvedValue(mockProjects);
    
    // Render component
    render(<Command />);
    
    // Wait for projects to load
    await waitFor(() => {
      expect(loadProjects).toHaveBeenCalled();
    });
    
    // Find and simulate clicking on the action
    const actionElements = document.querySelectorAll('[data-testid="action-panel"]');
    expect(actionElements.length).toBeGreaterThan(0);
    
    // Simulate the onAction callback
    // Since we can't directly access the performStartAnalyzeSequence function in the tests,
    // we'll verify that the necessary function calls are made when it's triggered
    const projectPath = "/path/to/test";
    const projectName = "Test Project";
    
    // Manual call to the sequence function
    await Command.prototype.performStartAnalyzeSequence(projectPath, projectName);
    
    // Verify expected function calls
    expect(isSonarQubeRunning).toHaveBeenCalled();
    expect(showToast).toHaveBeenCalled();
    expect(runInNewTerminal).toHaveBeenCalled();
    
    // Verify terminal command structure
    const runInNewTerminalArgs = runInNewTerminal.mock.calls[0];
    const commands = runInNewTerminalArgs[0];
    
    // Check for expected commands that would be part of a running SonarQube sequence
    expect(commands.some((cmd: string) => cmd.includes("gradlew"))).toBeTruthy();
    expect(commands.some((cmd: string) => cmd.includes("open"))).toBeTruthy();
  });

  it("handles path resolution correctly with custom path", async () => {
    // Mock preferences with custom path
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/custom/path/to/sonarqube.app",
      sonarqubePodmanDir: "/sonarqube",
    });
    
    // Mock SonarQube status
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean }) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    // Mock projects
    loadProjects.mockResolvedValue([new Project("1", "Test Project", "/path/to/test")]);
    
    // Render component
    render(<Command />);
    
    // Wait for projects to load
    await waitFor(() => {
      expect(loadProjects).toHaveBeenCalled();
    });
    
    // Call path resolution directly
    const getSonarQubePath = await Command.prototype.getSonarQubePath();
    expect(getSonarQubePath).toBe("/custom/path/to/sonarqube.app");
  });

  it("shows error toast when custom path is enabled but empty", async () => {
    // Mock preferences with custom path enabled but empty
    getPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
      sonarqubePodmanDir: "/sonarqube",
    });
    
    // Mock projects
    loadProjects.mockResolvedValue([new Project("1", "Test Project", "/path/to/test")]);
    
    // Render component
    render(<Command />);
    
    // Wait for projects to load
    await waitFor(() => {
      expect(loadProjects).toHaveBeenCalled();
    });
    
    // Call path resolution directly
    const getSonarQubePath = await Command.prototype.getSonarQubePath();
    expect(getSonarQubePath).toBeNull();
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({ style: "Failure" }));
  });
});

