/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "../../../commands/startAnalyzeOpenSonarQube";

// Mock @raycast/api
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ 
    style: '', 
    title: '', 
    message: '',
    primaryAction: { title: '', onAction: jest.fn() },
  }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
  openExtensionPreferences: jest.fn(),
}));

// Mock utils
jest.mock("../../../utils", () => ({
  runInNewTerminal: jest.fn(),
  isSonarQubeRunning: jest.fn(),
}));

// Mock i18n
jest.mock("../../../i18n", () => ({
  __: jest.fn((key) => `translated.${key}`),
}));

const { getPreferenceValues, showToast } = require("@raycast/api");
const { runInNewTerminal, isSonarQubeRunning } = require("../../../utils");

describe("startAnalyzeOpenSonarQube with enhanced status detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  // Test for when SonarQube is in "starting" state
  it("should use longer wait times when SonarQube is in starting state", async () => {
    // Set up mocks
    getPreferenceValues.mockReturnValue({ 
      sonarqubePodmanDir: "/podman", 
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Mock SonarQube in "starting" state
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      if (options && options.detailed) {
        return { 
          running: false, 
          status: "starting", 
          details: "SonarQube is still initializing" 
        };
      }
      return false;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify showToast was called with appropriate message
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: expect.any(String),
        message: expect.stringContaining("translated.commands.startSonarQube.pleaseWait")
      })
    );
    
    // Verify terminal commands include longer sleep time
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    
    // There should be a sleep command with longer duration (60 seconds)
    const sleepCommand = commands.find((cmd: string) => cmd.includes("sleep"));
    expect(sleepCommand).toBeTruthy();
    expect(sleepCommand).toMatch(/sleep (45|60)/); // Check for 45 or 60 seconds
    
    // Should NOT include podman start commands
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
  
  // Test for timeout state
  it("should perform additional check with longer timeout when initial request times out", async () => {
    // Set up mocks
    getPreferenceValues.mockReturnValue({ 
      sonarqubePodmanDir: "/podman", 
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // First call returns timeout, second call returns running
    let callCount = 0;
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      callCount++;
      if (options && options.detailed) {
        if (callCount === 1) {
          return { running: false, status: "timeout", details: "Connection timed out" };
        } else {
          return { running: true, status: "running", details: "SonarQube is running" };
        }
      }
      return callCount > 1;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called twice
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Verify second call includes longer timeout
    expect(isSonarQubeRunning.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        detailed: true,
        timeout: expect.any(Number)
      })
    );
    
    // Verify showToast was called with checking status message first
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "Animated",
        title: expect.any(String),
        message: expect.stringContaining("translated.commands.startSonarQube.checkingStatus")
      })
    );
    
    // Commands should not include podman start
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeFalsy();
  });
  
  // Test SonarQube completely stopped scenario
  it("should start SonarQube if it's completely stopped", async () => {
    // Set up mocks
    getPreferenceValues.mockReturnValue({ 
      sonarqubePodmanDir: "/podman", 
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Mock SonarQube as completely stopped
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      if (options && options.detailed) {
        return { running: false, status: "down", details: "SonarQube is not running" };
      }
      return false;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Commands should include podman start
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeTruthy();
  });
  
  // Test for second check with mixed results
  it("should handle the case where second check still shows timeout", async () => {
    // Set up mocks
    getPreferenceValues.mockReturnValue({ 
      sonarqubePodmanDir: "/podman", 
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Both calls return timeout
    isSonarQubeRunning.mockImplementation(async (options?: { detailed?: boolean; retries?: number; timeout?: number }) => {
      if (options && options.detailed) {
        return { running: false, status: "timeout", details: "Connection timed out" };
      }
      return false;
    });
    
    // Call the function
    await startAnalyzeOpenSonarQube();
    
    // Verify isSonarQubeRunning was called twice
    expect(isSonarQubeRunning).toHaveBeenCalledTimes(2);
    
    // Commands should include podman start since it's still not responding
    const callArgs = runInNewTerminal.mock.calls[0];
    const commands = callArgs[0];
    const podmanStartCommand = commands.find((cmd: string) => cmd.includes("podman machine start"));
    expect(podmanStartCommand).toBeTruthy();
  });
});
