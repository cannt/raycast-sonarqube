/**
 * @jest-environment jsdom
 */

import React from "react";
import { render, act } from "@testing-library/react";
import { StartAnalyzeOpenSonarQubeComponent } from "../../../lib/startAnalyzeOpenSonarQubeComponent";

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

interface ProjectsListProps {
  projects: { name: string; path: string }[];
  isLoading: boolean;
  onStartAnalyze: (path: string, name: string) => Promise<void>;
}

// Extend Jest's MockInstance type to include our custom properties
type ProjectsListMock = jest.Mock & {
  mockProps?: ProjectsListProps;
}

// Track mock interactions
const mockToastCalls: Array<{style: string, title: string, message?: string}> = [];
const mockTerminalCommands: string[][] = [];
const mockHandleStartAnalyze = jest.fn();
const mockTranslate = jest.fn((key: string) => `translated.${key}`);
const mockShowToast = jest.fn();
const mockRunInNewTerminal = jest.fn();
const mockIsSonarQubeRunning = jest.fn();
const mockGetPreferenceValues = jest.fn();
const mockOpenExtensionPreferences = jest.fn();

// Create a state object for SonarQube status
const mockSonarqubeState = {
  running: false,
  status: "down",
  details: "SonarQube is not running",
  detailedResult: {
    webUp: false,
    dbUp: false,
    status: "down"
  }
};

// Mock all dependencies before importing anything
jest.mock("@raycast/api", () => ({
  getPreferenceValues: () => mockGetPreferenceValues(),
  showToast: (config: ToastConfig) => mockShowToast(config),
  openExtensionPreferences: () => mockOpenExtensionPreferences(),
  Toast: {
    Style: {
      Animated: "Animated",
      Success: "Success", 
      Failure: "Failure"
    }
  }
}));

jest.mock("../../../hooks/useProjectLoader", () => ({
  useProjectLoader: jest.fn(() => ({
    projects: [
      { name: "Project 1", path: "/path/to/project1" },
      { name: "Project 2", path: "/path/to/project2" }
    ],
    isLoading: false
  }))
}));

jest.mock("../../../hooks/useSonarQubePath", () => ({
  useSonarQubePath: jest.fn(() => ({
    getSonarQubePath: jest.fn().mockResolvedValue("http://localhost:9000")
  }))
}));

jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(() => ({
    performStartAnalyzeSequence: jest.fn(async (projectPath, projectName, targetOpenPath) => {
      mockHandleStartAnalyze(projectPath, projectName, targetOpenPath);
      
      try {
        // Check if SonarQube is running
        const status = await mockIsSonarQubeRunning({ detailed: true });
        
        // If it's running, show success toast
        if (status && status.running) {
          await mockShowToast({
            style: "Success",
            title: mockTranslate("commands.startSonarQube.alreadyRunning")
          });
          return true;
        }
        
        // Otherwise check preferences
        const prefs = mockGetPreferenceValues();
        
        // Run terminal command based on preferences
        if (prefs.useCustomSonarQubeApp && prefs.sonarqubeAppPath) {
          await mockRunInNewTerminal(
            [`open ${prefs.sonarqubeAppPath}`],
            "Opening SonarQube",
            "Failed to open SonarQube"
          );
        } else {
          await mockRunInNewTerminal(
            ["test command"],
            "Opening SonarQube",
            "Failed to open SonarQube"
          );
        }
        
        return true;
      } catch (error) {
        // Handle errors with toast
        await mockShowToast({
          style: "Failure",
          title: "Error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
        
        return false;
      }
    })
  }))
}));

jest.mock("../../../components/ProjectsList", () => ({
  ProjectsList: jest.fn(({ projects, isLoading, onStartAnalyze }) => {
    // Store the props for test access
    const ProjectsList = jest.requireMock("../../../components/ProjectsList").ProjectsList;
    ProjectsList.mockProps = { projects, isLoading, onStartAnalyze };
    // Return a valid React element
    return <div data-testid="projects-list">Projects List Mock</div>;
  })
}));

jest.mock("../../../i18n", () => ({
  __: (key: string) => mockTranslate(key)
}));

jest.mock("../../../utils", () => ({
  isSonarQubeRunning: (options?: any) => {
    // Return the current state
    const result = options?.detailed 
      ? { ...mockSonarqubeState, detailedResult: { ...mockSonarqubeState.detailedResult } }
      : { running: mockSonarqubeState.running, status: mockSonarqubeState.status };
    
    return mockIsSonarQubeRunning(options) || Promise.resolve(result);
  },
  runInNewTerminal: (commands: string[], successMsg: string, errorMsg: string) => {
    // Always push the commands to the mockTerminalCommands array
    mockTerminalCommands.push([...commands]);
    // Call the mock function to track the call for assertions
    return mockRunInNewTerminal(commands, successMsg, errorMsg);
  }
}));

// Default implementation for runInNewTerminal
mockRunInNewTerminal.mockImplementation((commands: string[], successMsg: string, errorMsg: string) => {
  return Promise.resolve();
});

// Import after all mocks are set up
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { isSonarQubeRunning, runInNewTerminal } from "../../../utils";
import { __ } from "../../../i18n";

// Get the ProjectsList mock with our custom type
const ProjectsList = jest.requireMock("../../../components/ProjectsList").ProjectsList as ProjectsListMock;

describe("StartAnalyzeOpenSonarQubeComponent Comprehensive Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastCalls.length = 0;
    mockTerminalCommands.length = 0;
    
    // Reset SonarQube state
    mockSonarqubeState.running = false;
    mockSonarqubeState.status = "down";
    mockSonarqubeState.details = "SonarQube is not running";
    mockSonarqubeState.detailedResult = {
      webUp: false,
      dbUp: false,
      status: "down"
    };
    
    // Default implementation for getPreferenceValues
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Default implementation for showToast
    mockShowToast.mockImplementation((config: ToastConfig) => {
      mockToastCalls.push({
        style: config.style,
        title: config.title,
        message: config.message
      });
      
      return Promise.resolve({
        hide: jest.fn()
      });
    });
    
    // Default implementation for isSonarQubeRunning
    mockIsSonarQubeRunning.mockImplementation((options?: any) => {
      return Promise.resolve({
        running: mockSonarqubeState.running,
        status: mockSonarqubeState.status,
        details: mockSonarqubeState.details,
        ...(options?.detailed ? { detailedResult: mockSonarqubeState.detailedResult } : {})
      });
    });
  });
  
  it("renders with project list", () => {
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Check that ProjectsList was called
    expect(ProjectsList).toHaveBeenCalled();
    
    // Get the mock props that were stored during the call
    const mockProps = ProjectsList.mockProps;
    
    // Verify the props were passed correctly
    expect(mockProps).toEqual(expect.objectContaining({
      projects: expect.arrayContaining([
        expect.objectContaining({ name: "Project 1" }),
        expect.objectContaining({ name: "Project 2" })
      ]),
      isLoading: false,
      onStartAnalyze: expect.any(Function)
    }));
  });
  
  it("starts analysis when project is selected", async () => {
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/path/to/project1", "Project 1");
      }
    });
    
    // Verify the handleStartAnalyze was called with correct args
    expect(mockHandleStartAnalyze).toHaveBeenCalledWith(
      "/path/to/project1",
      "Project 1",
      "http://localhost:9000"
    );
  });
  
  it("handles null SonarQube path gracefully", async () => {
    // Mock useSonarQubePath to return null path
    jest.requireMock("../../../hooks/useSonarQubePath").useSonarQubePath.mockReturnValueOnce({
      getSonarQubePath: jest.fn().mockResolvedValue(null)
    });
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/path/to/project1", "Project 1");
      }
    });
    
    // Should show error toast
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Failure",
      title: expect.any(String)
    }));
    
    // Should not proceed with analysis
    expect(mockHandleStartAnalyze).not.toHaveBeenCalled();
  });
  
  it("handles terminal execution errors", async () => {
    // Set up terminal error
    mockRunInNewTerminal.mockRejectedValueOnce(new Error("Terminal execution failed"));
    
    // SonarQube is not running in this test
    mockSonarqubeState.running = false;
    mockSonarqubeState.status = "down";
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/path/to/project1", "Project 1");
      }
    });
    
    // Verify the handleStartAnalyze was called with correct args
    expect(mockHandleStartAnalyze).toHaveBeenCalledWith(
      "/path/to/project1",
      "Project 1",
      "http://localhost:9000"
    );
    
    // Verify error toast was shown
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Failure",
      title: expect.any(String)
    }));
  });
  
  it("shows toast when SonarQube is already running", async () => {
    // Mock SonarQube already running
    mockSonarqubeState.running = true;
    mockSonarqubeState.status = "running";
    mockSonarqubeState.details = "SonarQube is running";
    mockSonarqubeState.detailedResult = {
      webUp: true,
      dbUp: true,
      status: "running"
    };
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/path/to/project1", "Project 1");
      }
    });
    
    // Verify the handleStartAnalyze was called with correct args
    expect(mockHandleStartAnalyze).toHaveBeenCalledWith(
      "/path/to/project1",
      "Project 1",
      "http://localhost:9000"
    );
    
    // Should show success toast with the correct message
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Success",
      title: expect.stringContaining("translated.commands.startSonarQube.alreadyRunning")
    }));
    
    // Since SonarQube is already running, terminal commands should not be executed
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
  });
  
  it("uses custom SonarQube app path from preferences", async () => {
    // Set up custom app path preference
    const customAppPath = "/Applications/Custom/SonarQube.app";
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: customAppPath
    });
    
    // SonarQube is not running in this test
    mockSonarqubeState.running = false;
    mockSonarqubeState.status = "down";
    
    // Reset all mock states
    mockRunInNewTerminal.mockClear();
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/path/to/project1", "Project 1");
      }
    });
    
    // Verify runInNewTerminal was called with the custom app path
    expect(mockRunInNewTerminal).toHaveBeenCalledWith(
      [`open ${customAppPath}`],
      "Opening SonarQube",
      "Failed to open SonarQube"
    );
    
    // This is the key assertion - verifying the custom app path is used
    const mockCalls = mockRunInNewTerminal.mock.calls;
    expect(mockCalls.length).toBeGreaterThan(0);
    
    if (mockCalls.length > 0) {
      // First argument of the first call should be the commands array
      const commands = mockCalls[0][0];
      expect(commands.some((cmd: string) => cmd.includes(customAppPath))).toBe(true);
    }
  });
  
  it("handles SonarQube in starting state correctly", async () => {
    // Set SonarQube in starting state
    mockSonarqubeState.running = false;
    mockSonarqubeState.status = "starting";
    mockSonarqubeState.details = "SonarQube is starting";
    mockSonarqubeState.detailedResult = {
      webUp: false,
      dbUp: true,
      status: "starting"
    };
    
    // Setup translations
    mockTranslate.mockImplementation((key) => `translated.${key}`);
    
    // Setup preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Update the isSonarQubeRunning mock to specifically handle this test case
    mockIsSonarQubeRunning.mockImplementationOnce((options?: any) => {
      // When first called with detailed: true, return the starting state
      return Promise.resolve({
        running: false,
        status: "starting",
        details: "SonarQube is starting",
        detailedResult: {
          webUp: false,
          dbUp: true,
          status: "starting"
        }
      });
    });
    
    // Update the useCommandSequencer mock for this test case
    jest.requireMock("../../../hooks/useCommandSequencer").useCommandSequencer.mockReturnValueOnce({
      performStartAnalyzeSequence: jest.fn(async (projectPath, projectName, targetOpenPath) => {
        mockHandleStartAnalyze(projectPath, projectName, targetOpenPath);
        
        try {
          // Check if SonarQube is running
          const status = await mockIsSonarQubeRunning({ detailed: true });
          
          // If SonarQube is in starting state, show an animated toast
          if (status && status.status === "starting") {
            await mockShowToast({
              style: "Animated",
              title: mockTranslate('commands.startSonarQube.waiting'),
              message: mockTranslate('commands.startSonarQube.pleaseWait')
            });
            return true;
          }
          
          return true;
        } catch (error) {
          // Handle errors with toast
          await mockShowToast({
            style: "Failure",
            title: "Error",
            message: error instanceof Error ? error.message : "Unknown error"
          });
          
          return false;
        }
      })
    });
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/test/project/path", "Test Project");
      }
    });
    
    // Verify that a waiting toast was shown
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Animated",
      title: expect.stringContaining("translated."),
      message: expect.stringContaining("translated.")
    }));
  });
  
  it("handles detailed error scenarios with localized messages", async () => {
    // Set SonarQube as not running for this test
    mockSonarqubeState.running = false;
    mockSonarqubeState.status = "down";
    mockSonarqubeState.details = "SonarQube is not running";
    mockSonarqubeState.detailedResult = {
      webUp: false,
      dbUp: false,
      status: "down"
    };
    
    // Setup translations
    mockTranslate.mockImplementation((key) => `translated.${key}`);
    
    // Setup preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Make runInNewTerminal throw an error
    mockRunInNewTerminal.mockRejectedValueOnce(new Error("Test terminal error"));
    
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Get the stored onStartAnalyze function from the mock props
    const onStartAnalyze = ProjectsList.mockProps?.onStartAnalyze;
    expect(onStartAnalyze).toBeDefined();
    
    await act(async () => {
      if (onStartAnalyze) {
        await onStartAnalyze("/test/project/path", "Test Project");
      }
    });
    
    // Verify error toast was shown with translated messages
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Failure",
      title: expect.stringContaining("Error"),
      message: expect.stringContaining("Test terminal error")
    }));
  });
});
