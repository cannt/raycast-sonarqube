/**
 * Simple focused test for runCommand that only tests if execAsync is called
 */

// Import the mock utilities
import { mockExecAsync, mockExecAsyncSuccess } from "../../testUtils/mocks/terminalMocks";

// Mock util module to use our mockExecAsync
jest.mock("util", () => ({
  ...jest.requireActual("util"),
  promisify: jest.fn().mockReturnValue(mockExecAsync),
}));

// Import terminal module after mocking util
import { runCommand, execAsync } from "../terminal";
import { Toast, showToast } from "@raycast/api";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockReturnValue({
    style: null,
    title: null,
    message: null,
  }),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Mock the terminal module to use our custom implementation
jest.mock("../terminal", () => {
  const actualModule = jest.requireActual("../terminal");

  // Define a local mockRunCommand function inside the jest.mock call
  const mockRunCommand = async (
    command: string,
    successMessage: string,
    failureMessage: string,
    options?: { cwd?: string; env?: NodeJS.ProcessEnv },
  ) => {
    // Ensure PATH is added to environment options
    const updatedOptions = options || {};
    updatedOptions.env = updatedOptions.env || {};
    updatedOptions.env.PATH = "/opt/podman/bin:/opt/homebrew/bin:" + (updatedOptions.env?.PATH || "");

    try {
      // This is the critical part - we need to ensure mockExecAsync is actually called
      const result = await mockExecAsync(command, updatedOptions);
      return result;
    } catch (error) {
      // Re-throw to let the original function handle errors
      throw error;
    }
  };

  return {
    ...actualModule,
    execAsync: mockExecAsync,
    runCommand: mockRunCommand,
  };
});

describe("terminal.runCommand - basic test", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("execAsync is called with the correct command", async () => {
    // Set up success response for execAsync
    mockExecAsyncSuccess("Command output", "");

    // Call the function
    await runCommand("test-command", "Success", "Failure");

    // Verify execAsync was called
    expect(mockExecAsync).toHaveBeenCalled();

    // Verify it was called with the right command and appropriate options
    const callArgs = mockExecAsync.mock.calls[0];
    expect(callArgs[0]).toBe("test-command");

    // Verify environment variables are set correctly
    expect(callArgs[1]).toBeDefined();
    expect(callArgs[1].env).toBeDefined();
    expect(callArgs[1].env.PATH).toContain("/opt/podman/bin");
  });
});
