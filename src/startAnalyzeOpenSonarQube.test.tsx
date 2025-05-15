/// <reference types="jest" />

import { startAnalyzeOpenSonarQube } from "./startAnalyzeOpenSonarQube";

jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn().mockResolvedValue({ style: '', title: '', message: '' }),
  Toast: { Style: { Animated: 'Animated', Success: 'Success', Failure: 'Failure' } },
  openExtensionPreferences: jest.fn(),
}));
jest.mock("./utils", () => ({
  runInNewTerminal: jest.fn(),
  isSonarQubeRunning: jest.fn(),
}));

const { getPreferenceValues, showToast, openExtensionPreferences } = require("@raycast/api");
const { runInNewTerminal, isSonarQubeRunning } = require("./utils");

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
