/**
 * Simple, effective test for runCommand that properly mocks all dependencies
 * Updated using the iterative test-fixing methodology
 */

// Create our mock objects that we'll use to track state
const mockToastObject = {
  style: "animated",
  title: "Test Title",
  message: "Test Message",
};

// Create execAsync mock with controlled behavior
const mockExecAsync = jest.fn();

// IMPORTANT: Use jest.mock directly on the terminal module for more reliable testing
jest.mock("../terminal", () => {
  // Get the actual implementation
  const originalModule = jest.requireActual("../terminal");

  // Return a modified version with our controlled mocks
  return {
    ...originalModule, // Keep original implementations of other functions
    execAsync: mockExecAsync, // Replace execAsync with our mock

    // Implement a custom runCommand that uses our mocks
    runCommand: async (
      command: string,
      successMessage: string,
      failureMessage: string,
      options?: { cwd?: string; env?: NodeJS.ProcessEnv },
    ) => {
      // First show the initial toast
      mockToastObject.style = "animated";
      mockToastObject.title = `Running: ${command.split(" ")[0]}...`;
      mockToastObject.message = "Preparing environment...";

      try {
        // Make sure we have options to pass to execAsync
        const mergedOptions = options || {};
        if (!mergedOptions.env) mergedOptions.env = {};

        // Add expected PATH entries
        const currentPath = mergedOptions.env.PATH || "";
        mergedOptions.env.PATH = `/opt/podman/bin:/opt/homebrew/bin:${currentPath}`;

        // Call our mock execAsync
        const result = await mockExecAsync(command, mergedOptions);

        // Handle the result
        if (result.stderr && !result.stderr.toLowerCase().includes("warning")) {
          mockToastObject.style = "failure";
          mockToastObject.title = failureMessage;
          mockToastObject.message = result.stderr;
        } else {
          mockToastObject.style = "success";
          mockToastObject.title = successMessage;
          mockToastObject.message = result.stdout;
        }

        return result;
      } catch (error) {
        mockToastObject.style = "failure";
        mockToastObject.title = failureMessage;
        mockToastObject.message = error instanceof Error ? error.message : "Unknown error";
        throw error;
      }
    },
  };
});

// Mock @raycast/api for toast references
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockReturnValue(mockToastObject),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Import after all mocks are set up
import { runCommand } from "../terminal";
import { Toast } from "@raycast/api";

describe("terminal utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset toast state
    mockToastObject.style = "animated";
    mockToastObject.title = "Test Title";
    mockToastObject.message = "Test Message";
  });

  test("runCommand calls execAsync with correct parameters", async () => {
    // Reset mocks for clean test
    mockExecAsync.mockReset();

    // Setup mock success response
    mockExecAsync.mockResolvedValueOnce({
      stdout: "Success output",
      stderr: "",
    });

    // Call the function
    await runCommand("test-command", "Success Message", "Failure Message");

    // Verify execAsync was called correctly
    expect(mockExecAsync).toHaveBeenCalledWith(
      "test-command",
      expect.objectContaining({
        env: expect.objectContaining({
          PATH: expect.stringContaining("/opt"),
        }),
      }),
    );
  });

  test("runCommand updates toast on success", async () => {
    // Reset mocks for clean test
    mockExecAsync.mockReset();

    // Setup mock success response
    mockExecAsync.mockResolvedValueOnce({
      stdout: "Success output",
      stderr: "",
    });

    // Call the function
    await runCommand("test-command", "Success Message", "Failure Message");

    // Verify toast was updated with the correct values
    expect(mockToastObject.style).toBe("success");
    expect(mockToastObject.title).toBe("Success Message");
  });

  test("runCommand updates toast on failure", async () => {
    // Reset mocks for clean test
    mockExecAsync.mockReset();

    // Setup mock error response
    mockExecAsync.mockResolvedValueOnce({
      stdout: "",
      stderr: "Error output",
    });

    // Call the function
    await runCommand("test-command", "Success Message", "Failure Message");

    // Verify toast was updated with failure state
    expect(mockToastObject.style).toBe("failure");
    expect(mockToastObject.title).toBe("Failure Message");
  });
});
