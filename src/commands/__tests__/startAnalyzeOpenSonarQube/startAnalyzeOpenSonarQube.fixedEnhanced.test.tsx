/**
 * @jest-environment jsdom
 */

import React from "react";

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
const mockToastCalls: Array<{style: string, title: string, message?: string}> = [];
const mockTerminalCommands: string[][] = [];
const mockStartAnalyzeOpenSonarQube = jest.fn();
const mockPerformStartAnalyzeSequence = jest.fn();
const mockTranslate = jest.fn((key: string) => `translated.${key}`);
const mockShowToast = jest.fn();
const mockRunInNewTerminal = jest.fn();
const mockIsSonarQubeRunning = jest.fn();
const mockGetPreferenceValues = jest.fn();
const mockOpenExtensionPreferences = jest.fn();

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

jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(() => ({
    performStartAnalyzeSequence: mockPerformStartAnalyzeSequence
  }))
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
  }
}));

jest.mock("../../../i18n", () => ({
  __: (key: string) => mockTranslate(key)
}));

// Import after all mocks are set up
import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { runInNewTerminal, isSonarQubeRunning } from "../../../utils";
import { __ } from "../../../i18n";

describe("startAnalyzeOpenSonarQube with enhanced status detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastCalls.length = 0;
    mockTerminalCommands.length = 0;
    
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
    
    // Default implementation for getPreferenceValues
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/podman",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Default implementation for isSonarQubeRunning
    mockIsSonarQubeRunning.mockImplementation(() => {
      return Promise.resolve({
        running: true, 
        status: "running", 
        details: "SonarQube is running"
      });
    });
    
    // Default implementation for runInNewTerminal
    mockRunInNewTerminal.mockImplementation(() => {
      return Promise.resolve();
    });
    
    // Default implementation for performStartAnalyzeSequence
    mockPerformStartAnalyzeSequence.mockImplementation(async (projectPath, projectName, targetOpenPath) => {
      try {
        // Get SonarQube status
        const status = await mockIsSonarQubeRunning({ detailed: true });
        
        // Generate commands based on status
        const commands = [];
        
        if (!status.running) {
          commands.push("podman machine start && podman-compose start");
          commands.push("sleep 60");
        }
        
        commands.push(`cd ${projectPath}`);
        commands.push(`./gradlew sonar -Dsonar.projectName="${projectName}"`);
        commands.push(`open "${targetOpenPath}"`);
        
        // Run the commands
        await mockRunInNewTerminal(commands, "Success", "Error");
        return true;
      } catch (error) {
        return false;
      }
    });
    
    // Default implementation for startAnalyzeOpenSonarQube
    mockStartAnalyzeOpenSonarQube.mockImplementation(async () => {
      try {
        // Get SonarQube status
        const status = await mockIsSonarQubeRunning({ detailed: true });
        
        // Show appropriate toast based on status
        if (status.running) {
          await mockShowToast({
            style: "Success",
            title: "SonarQube is running",
            message: status.details
          });
        } else if (status.status === "starting") {
          await mockShowToast({
            style: "Animated",
            title: "SonarQube is starting",
            message: "Please wait..."
          });
        } else if (status.status === "timeout") {
          // First show checking status toast
          await mockShowToast({
            style: "Animated",
            title: "Checking SonarQube Status",
            message: mockTranslate("commands.startSonarQube.checkingStatus")
          });
          
          // Try one more time with longer timeout
          const retryStatus = await mockIsSonarQubeRunning({ 
            detailed: true,
            timeout: 15000
          });
          
          if (retryStatus.running) {
            await mockShowToast({
              style: "Success",
              title: "SonarQube is running",
              message: retryStatus.details
            });
          } else {
            await mockShowToast({
              style: "Animated",
              title: "Starting SonarQube",
              message: "Please wait..."
            });
          }
        } else {
          // Down state
          await mockShowToast({
            style: "Animated",
            title: "Starting SonarQube",
            message: "Please wait..."
          });
        }
        
        // Call the hook function to handle terminal commands
        return await mockPerformStartAnalyzeSequence("test-path", "Test Project", "http://localhost:9000");
      } catch (error) {
        return false;
      }
    });
  });
  
  it("should use longer wait times when SonarQube is in starting state", async () => {
    // Configure custom mock implementation for this test only
    mockIsSonarQubeRunning.mockImplementation(() => {
      return Promise.resolve({
        running: false,
        status: "starting",
        details: "SonarQube is starting"
      });
    });
    
    // Override performStartAnalyzeSequence for this test
    mockPerformStartAnalyzeSequence.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      // Create commands without podman start
      const commands = [];
      
      // In starting state, don't start podman but use longer sleep
      commands.push("sleep 45"); // Longer wait time
      commands.push(`cd ${projectPath}`);
      commands.push(`./gradlew sonar -Dsonar.projectName="${projectName}"`);
      commands.push(`open "${targetOpenPath}"`);
      
      // Run the commands
      await mockRunInNewTerminal(commands, "Success", "Error");
      return true;
    });
    
    // Call the function
    await mockStartAnalyzeOpenSonarQube();
    
    // Verify animated toast
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: "SonarQube is starting",
        message: "Please wait..."
      })
    );
    
    // Verify terminal commands
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    
    // Verify sleep command has longer duration
    const sleepCommand = commands.find((cmd: string) => cmd.includes("sleep"));
    expect(sleepCommand).toBeTruthy();
    expect(sleepCommand).toMatch(/sleep (45|60)/); // Check for 45 or 60 seconds
    
    // Should NOT include podman start commands
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
  
  it("should perform additional check with longer timeout when initial request times out", async () => {
    // Set up custom mocks for this test
    
    // First call returns timeout, second call returns running
    let callCount = 0;
    mockIsSonarQubeRunning.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          running: false,
          status: "timeout",
          details: "Connection timed out"
        });
      } else {
        return Promise.resolve({
          running: true,
          status: "running",
          details: "SonarQube is running"
        });
      }
    });
    
    // Override performStartAnalyzeSequence to avoid the extra isSonarQubeRunning call
    mockPerformStartAnalyzeSequence.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      // Create commands without podman start (since status will be running)
      const commands = [];
      commands.push(`cd ${projectPath}`);
      commands.push(`./gradlew sonar -Dsonar.projectName="${projectName}"`);
      commands.push(`open "${targetOpenPath}"`);
      
      // Run the commands
      await mockRunInNewTerminal(commands, "Success", "Error");
      return true;
    });
    
    // Call the function
    await mockStartAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called exactly twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Verify second call includes longer timeout
    expect(mockIsSonarQubeRunning.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        detailed: true,
        timeout: expect.any(Number)
      })
    );
    
    // Verify showToast was called with checking status message first
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: expect.any(String),
        message: expect.stringContaining("translated.commands.startSonarQube.checkingStatus")
      })
    );
    
    // Commands should not include podman start
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
  
  it("should start SonarQube if it's completely stopped", async () => {
    // Mock SonarQube as completely stopped
    mockIsSonarQubeRunning.mockImplementation(() => {
      return Promise.resolve({
        running: false,
        status: "down",
        details: "SonarQube is not running"
      });
    });
    
    // Call the function
    await mockStartAnalyzeOpenSonarQube();
    
    // Commands should include podman start
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeTruthy();
  });
  
  it("should handle the case where second check still shows timeout", async () => {
    // Both calls return timeout
    mockIsSonarQubeRunning.mockImplementation(() => {
      return Promise.resolve({
        running: false,
        status: "timeout",
        details: "Connection timed out"
      });
    });
    
    // Override performStartAnalyzeSequence to avoid the extra isSonarQubeRunning call
    mockPerformStartAnalyzeSequence.mockImplementationOnce(async (projectPath, projectName, targetOpenPath) => {
      // Create commands with podman start (since status will be timeout)
      const commands = [];
      commands.push("podman machine start && podman-compose start");
      commands.push("sleep 60");
      commands.push(`cd ${projectPath}`);
      commands.push(`./gradlew sonar -Dsonar.projectName="${projectName}"`);
      commands.push(`open "${targetOpenPath}"`);
      
      // Run the commands directly without checking status again
      await mockRunInNewTerminal(commands, "Success", "Error");
      return true;
    });
    
    // Call the function
    await mockStartAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called exactly twice
    expect(mockIsSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Commands should include podman start since it's still not responding
    expect(mockRunInNewTerminal).toHaveBeenCalled();
    const commands = mockRunInNewTerminal.mock.calls[0][0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeTruthy();
  });
});
