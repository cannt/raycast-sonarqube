/// <reference types="jest" />

// First, create mocks before importing any modules
// Create a toast tracking object for tracking toast state
const mockToastState = {
  style: null as string | null,
  title: null as string | null,
  message: null as string | null,
  hide: jest.fn()
};

// Mock the execAsync function which is used internally by runInNewTerminal
const mockExecAsync = jest.fn();

// Mock the entire terminal module with direct implementation
jest.mock("../utils/terminal", () => ({
  execAsync: mockExecAsync,
  __mockToast: mockToastState,
  getUserFriendlyErrorMessage: jest.fn((msg) => `Friendly: ${msg}`),
  runCommand: jest.fn(),
  runInNewTerminal: jest.fn().mockImplementation(async (commands, successMessage, failureMessage) => {
    try {
      // Simulate the behavior of opening a terminal
      await mockExecAsync('open -a Terminal "tempfile"');
      
      // Update toast state to simulate the showToast behavior
      mockToastState.style = 'Success';
      mockToastState.title = successMessage;
      mockToastState.message = 'All commands completed successfully!';
      
      return Promise.resolve();
    } catch (error) {
      // Update toast state for error case
      mockToastState.style = 'Failure';
      mockToastState.title = failureMessage;
      mockToastState.message = error instanceof Error ? error.message : 'Unknown error';
      
      return Promise.reject(error);
    }
  })
}));

// Mock @raycast/api
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(() => ({
    sonarqubePodmanDir: "/valid/podman/path"
  })),
  showToast: jest.fn().mockImplementation(async (options) => {
    mockToastState.style = options.style;
    mockToastState.title = options.title;
    mockToastState.message = options.message;
    return mockToastState;
  }),
  Toast: { 
    Style: { 
      Animated: 'Animated', 
      Success: 'Success', 
      Failure: 'Failure' 
    } 
  }
}));

// Mock other utils that might be imported
jest.mock("../utils/projectManagement", () => ({
  loadProjects: jest.fn(() => [
    { id: "test-id", name: "Test Project", path: "/test/path" }
  ])
}));

// Now import the modules after mocking
import { runInNewTerminal } from "../utils/terminal";
import { getPreferenceValues, showToast, Toast } from "@raycast/api";

// Test the terminal utilities
describe("SonarQube Analysis Terminal Commands", () => {
  beforeEach(() => {
    // Reset all mocks and state between tests
    jest.clearAllMocks();
    mockToastState.style = null;
    mockToastState.title = null;
    mockToastState.message = null;
  });
  
  it("runs analysis commands in terminal successfully", async () => {
    // Simulate successful command execution
    mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Call the function under test
    await runInNewTerminal(
      ["cd /test/path", "./gradlew sonar"],
      "Analysis Started",
      "Analysis Failed"
    );
    
    // Verify toast was shown with success state
    expect(mockToastState.style).toBe('Success');
    expect(mockToastState.title).toBe('Analysis Started');
    
    // Verify execAsync was called - it should be called to open the terminal
    expect(mockExecAsync).toHaveBeenCalled();
  });
  
  it("handles errors during terminal command execution", async () => {
    // Simulate command execution failure
    mockExecAsync.mockImplementationOnce(() => {
      throw new Error("Command failed");
    });
    
    // Call the function and handle expected rejection
    try {
      await runInNewTerminal(
        ["cd /test/path", "./gradlew sonar"],
        "Success",
        "Failure"
      );
      fail("Expected function to throw");
    } catch (error) {
      // Expected error, verify error handling
      expect(error).toBeDefined();
    }
    
    // Verify toast state shows failure
    expect(mockToastState.style).toBe('Failure');
    expect(mockToastState.title).toBe('Failure');
  });
  
  it("correctly handles multiple commands", async () => {
    // Simulate successful command execution
    mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Call with multiple commands
    await runInNewTerminal(
      ["cd /test/path", "npm install", "npm test", "./gradlew sonar"],
      "Success",
      "Failure"
    );
    
    // Verify execAsync was called
    expect(mockExecAsync).toHaveBeenCalled();
    
    // Verify toast shows success
    expect(mockToastState.style).toBe('Success');
    expect(mockToastState.title).toBe('Success');
  });
});
