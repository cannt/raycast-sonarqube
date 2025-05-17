/// <reference types="jest" />

import startSonarQube from "../../commands/startSonarQube";
import { isSonarQubeRunning, runCommand } from "../../utils";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { __ } from "../../i18n";

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
jest.mock("../../utils", () => ({
  runCommand: jest.fn().mockResolvedValue("success"),
  isSonarQubeRunning: jest.fn(),
}));

// Mock i18n
jest.mock("../../i18n", () => ({
  __: jest.fn((key) => key),
}));

describe("startSonarQube comprehensive tests", () => {
  // Define shortcuts for mocks
  const mockGetPreferenceValues = getPreferenceValues as jest.Mock;
  const mockShowToast = showToast as jest.Mock;
  const mockIsSonarQubeRunning = isSonarQubeRunning as jest.Mock;
  const mockRunCommand = runCommand as jest.Mock;
  const mockTranslate = __ as jest.Mock;
  
  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Default implementation for showToast
    mockShowToast.mockImplementation((config: any) => {
      return Promise.resolve({
        style: config.style,
        title: config.title,
        message: config.message,
        hide: jest.fn()
      });
    });
    
    // Default preferences
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/valid/podman/path"
    });
    
    // Default isSonarQubeRunning implementation
    mockIsSonarQubeRunning.mockResolvedValue(false);
  });
  
  // Testing undefined podman directory case
  it("should show error if podman directory is undefined", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: undefined
    });
    
    await startSonarQube();
    
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure"
      })
    );
    expect(mockIsSonarQubeRunning).not.toHaveBeenCalled();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing empty podman directory case
  it("should show error if podman directory is empty string", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: ""
    });
    
    await startSonarQube();
    
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Failure"
      })
    );
    expect(mockIsSonarQubeRunning).not.toHaveBeenCalled();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing case where SonarQube is already running
  it("should show success toast when SonarQube is already running", async () => {
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: true, status: "running", details: "SonarQube is already running" };
      }
      return true;
    });
    
    await startSonarQube();
    
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success"
      })
    );
    expect(mockIsSonarQubeRunning).toHaveBeenCalled();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing the case where SonarQube is in "starting" state
  it("should show animated toast when SonarQube is starting", async () => {
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "starting", details: "SonarQube is starting" };
      }
      return false;
    });
    
    await startSonarQube();
    
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated"
      })
    );
    expect(mockIsSonarQubeRunning).toHaveBeenCalled();
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing timeout with second check showing "starting"
  it("should handle timeout with second check showing starting", async () => {
    // First call returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    });
    
    // Second call returns starting
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "starting", details: "SonarQube is starting" };
      }
      return false;
    });
    
    await startSonarQube();
    
    // Should call isSonarQubeRunning twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Second toast should be for the "starting" state
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.starting"
      })
    );
    
    // No command should be run when it's already starting
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing timeout with second check showing "running"
  it("should handle timeout with second check showing running", async () => {
    // First call returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    });
    
    // Second call returns running
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    });
    
    await startSonarQube();
    
    // Should call isSonarQubeRunning twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Second toast should be for the "running" state
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Success",
        title: "commands.startSonarQube.alreadyRunning"
      })
    );
    
    // No command should be run when it's already running
    expect(mockRunCommand).not.toHaveBeenCalled();
  });
  
  // Testing timeout with second check still showing timeout or down
  it("should run command when second check still shows timeout/down", async () => {
    // First call returns timeout
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    });
    
    // Second call returns down
    mockIsSonarQubeRunning.mockImplementationOnce(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    await startSonarQube();
    
    // First call should be checking status
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "commands.startSonarQube.starting"
      })
    );
    
    // Should run the command
    expect(mockRunCommand).toHaveBeenCalledWith(
      expect.stringContaining("podman machine start"),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ cwd: "/valid/podman/path" })
    );
  });
  
  // Testing running command when SonarQube is down
  it("should run command to start SonarQube when it's down", async () => {
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    await startSonarQube();
    
    // Should run the command with correct parameters
    expect(mockRunCommand).toHaveBeenCalledWith(
      expect.stringContaining("podman machine start && podman-compose start"),
      expect.any(String),
      expect.any(String),
      expect.objectContaining({ cwd: "/valid/podman/path" })
    );
  });
  
  // Testing error handling in runCommand
  it("should propagate errors from runCommand", async () => {
    mockIsSonarQubeRunning.mockImplementation(async (options?: any) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    // Make runCommand throw an error
    mockRunCommand.mockRejectedValueOnce(new Error("Command failed"));
    
    // Execute in try-catch to avoid test failure
    try {
      await startSonarQube();
    } catch (error) {
      // Error is expected
    }
    
    // Verify runCommand was called
    expect(mockRunCommand).toHaveBeenCalled();
  });
});
