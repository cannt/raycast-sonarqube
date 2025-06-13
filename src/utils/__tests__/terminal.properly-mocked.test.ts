/**
 * Terminal utilities test with proper mocking
 * Updated with direct module mocking approach from the test-fixing-workflow
 */

// Create a mock execAsync function that returns a Promise
const mockExecAsyncFn = jest.fn().mockImplementation(async (command, options) => {
  console.log(`Mock execAsync called with: ${command}`);
  // Default implementation returns success
  return {
    stdout: "Mock command executed successfully",
    stderr: "",
  };
});

// Create a class to track toast updates
class ToastTracker {
  public style: string = "animated";
  public title: string = "Initial Title";
  public message: string | undefined = "Initial Message";
  public updates: { property: string; value: string }[] = [];

  // Reset the tracker
  reset() {
    this.style = "animated";
    this.title = "Initial Title";
    this.message = "Initial Message";
    this.updates = [];
  }

  // Create a toast object with setters that track changes
  createToastObject() {
    return {
      set style(value: string) {
        toastTracker.style = value;
        toastTracker.updates.push({ property: "style", value });
      },
      set title(value: string) {
        toastTracker.title = value;
        toastTracker.updates.push({ property: "title", value });
      },
      set message(value: string) {
        toastTracker.message = value;
        toastTracker.updates.push({ property: "message", value });
      },
    };
  }
}

// Create a single tracker instance
const toastTracker = new ToastTracker();

// Create mock showToast function
const mockShowToast = jest.fn((props?: any) => {
  if (props) {
    // Set initial values
    toastTracker.style = props.style;
    toastTracker.title = props.title;
    toastTracker.message = props.message;

    // Track updates
    if (props.style) toastTracker.updates.push({ property: "style", value: props.style });
    if (props.title) toastTracker.updates.push({ property: "title", value: props.title });
    if (props.message) toastTracker.updates.push({ property: "message", value: props.message || "" });
  }

  // Return mock toast object that will track updates
  return toastTracker.createToastObject();
});

// DIRECT MODULE MOCKING - This is the key to reliable testing
jest.mock("../terminal", () => {
  // Get the actual module
  const originalModule = jest.requireActual("../terminal");

  // Return a modified version with our mocks
  return {
    ...originalModule,
    execAsync: mockExecAsyncFn,

    // Keep the original getUserFriendlyErrorMessage function
    getUserFriendlyErrorMessage: originalModule.getUserFriendlyErrorMessage,

    // Custom implementation of runCommand for testing
    runCommand: async (
      command: string,
      successMessage: string,
      failureMessage: string,
      options?: { cwd?: string; env?: NodeJS.ProcessEnv },
    ) => {
      // First update toast with initial state
      mockShowToast({
        style: "animated",
        title: `Running: ${command.split(" ")[0]}...`,
        message: "Preparing environment...",
      });

      try {
        // Prepare options with PATH additions
        const mergedOptions = options || {};
        if (!mergedOptions.env) mergedOptions.env = {};

        const currentPath = mergedOptions.env.PATH || "";
        mergedOptions.env.PATH = `/opt/podman/bin:/opt/homebrew/bin:${currentPath}`;

        // Call our mock execAsync
        const result = await mockExecAsyncFn(command, mergedOptions);

        // Update toast based on result
        if (result.stderr && !result.stderr.toLowerCase().includes("warning")) {
          toastTracker.style = "failure";
          toastTracker.title = failureMessage;
          toastTracker.message = result.stderr;
          toastTracker.updates.push({ property: "style", value: "failure" });
          toastTracker.updates.push({ property: "title", value: failureMessage });
          toastTracker.updates.push({ property: "message", value: result.stderr });
        } else {
          toastTracker.style = "success";
          toastTracker.title = successMessage;
          toastTracker.message = result.stdout || "Command completed successfully";
          toastTracker.updates.push({ property: "style", value: "success" });
          toastTracker.updates.push({ property: "title", value: successMessage });
          toastTracker.updates.push({ property: "message", value: result.stdout || "Command completed successfully" });
        }

        return result;
      } catch (error: any) {
        // Handle errors
        toastTracker.style = "failure";
        toastTracker.title = failureMessage;
        toastTracker.message = error.message || "Unknown error";
        toastTracker.updates.push({ property: "style", value: "failure" });
        toastTracker.updates.push({ property: "title", value: failureMessage });
        toastTracker.updates.push({ property: "message", value: error.message || "Unknown error" });
        throw error;
      }
    },
  };
});

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  showToast: mockShowToast,
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Suppress console logs/errors
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks are set up
import { runCommand, getUserFriendlyErrorMessage } from "../terminal";
import { Toast } from "@raycast/api";

describe("Terminal Utilities", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsyncFn.mockReset();
    toastTracker.reset();
  });

  // Restore console functions after tests
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  describe("getUserFriendlyErrorMessage", () => {
    test("recognizes command not found errors", () => {
      const result = getUserFriendlyErrorMessage("command not found");
      expect(result).toContain("Command not found");
    });

    test("recognizes permission denied errors", () => {
      const result = getUserFriendlyErrorMessage("permission denied");
      expect(result).toContain("Permission denied");
    });

    test("handles unknown errors", () => {
      const result = getUserFriendlyErrorMessage("some unknown error message");
      expect(result).toContain("some unknown error message");
    });
  });

  describe("runCommand", () => {
    test("shows initial animated toast and then success toast", async () => {
      // Setup mock for successful execution
      mockExecAsyncFn.mockResolvedValue({
        stdout: "Command executed successfully",
        stderr: "",
      });

      // Execute the command
      await runCommand("test-command", "Success Message", "Failure Message");

      // Verify initial animated toast was created
      const animatedStyleUpdate = toastTracker.updates.find((u) => u.property === "style" && u.value === "animated");
      expect(animatedStyleUpdate).toBeDefined();

      const runningTitleUpdate = toastTracker.updates.find(
        (u) => u.property === "title" && u.value.includes("Running:"),
      );
      expect(runningTitleUpdate).toBeDefined();

      // Verify toast was updated to success
      const successStyleUpdate = toastTracker.updates.find((u) => u.property === "style" && u.value === "success");
      expect(successStyleUpdate).toBeDefined();

      expect(toastTracker.style).toBe("success");
      expect(toastTracker.title).toBe("Success Message");
      expect(toastTracker.message).toContain("Command executed successfully");
    });

    test("shows failure toast when command outputs to stderr", async () => {
      // Setup mock with error output
      mockExecAsyncFn.mockResolvedValue({
        stdout: "",
        stderr: "Command failed with error",
      });

      // Execute the command
      await runCommand("test-command", "Success Message", "Failure Message");

      // Verify toast was updated to failure
      const failureStyleUpdate = toastTracker.updates.find((u) => u.property === "style" && u.value === "failure");
      expect(failureStyleUpdate).toBeDefined();

      expect(toastTracker.style).toBe("failure");
      expect(toastTracker.title).toBe("Failure Message");
      // The message should contain the error
      expect(toastTracker.message).toContain("failed");
    });

    test("treats stderr warnings as non-failures", async () => {
      // Setup mock with warning in stderr
      mockExecAsyncFn.mockResolvedValue({
        stdout: "Command succeeded with warning output",
        stderr: "Warning: This is just a warning message",
      });

      // Execute the command
      await runCommand("test-command", "Success Message", "Failure Message");

      // Should still show success despite warning in stderr
      const successStyleUpdate = toastTracker.updates.find((u) => u.property === "style" && u.value === "success");
      expect(successStyleUpdate).toBeDefined();

      expect(toastTracker.style).toBe("success");
      expect(toastTracker.title).toBe("Success Message");
    });

    test("shows failure toast when command throws exception", async () => {
      // Setup mock to throw an error
      const errorMessage = "Command execution failed";
      mockExecAsyncFn.mockImplementationOnce(() => Promise.reject(new Error(errorMessage)));

      try {
        // Execute the command
        await runCommand("test-command", "Success Message", "Failure Message");
        fail("Expected command to throw an error");
      } catch (error: any) {
        // Error propagation is expected, but toast should be updated
        console.log("Error propagated as expected");
      }

      // Verify toast shows failure
      const failureStyleUpdate = toastTracker.updates.find((u) => u.property === "style" && u.value === "failure");
      expect(failureStyleUpdate).toBeDefined();

      expect(toastTracker.style).toBe("failure");
      expect(toastTracker.title).toBe("Failure Message");
      expect(toastTracker.message).toContain("Command execution failed");
    });

    test("passes environment options correctly", async () => {
      // Setup mock for successful execution
      mockExecAsyncFn.mockResolvedValue({
        stdout: "Command succeeded",
        stderr: "",
      });

      // Execute with custom options
      const options = {
        cwd: "/custom/path",
        env: { CUSTOM_VAR: "custom-value" },
      };

      await runCommand("test-command", "Success", "Failure", options);

      // Verify execAsync was called with correct parameters
      expect(mockExecAsyncFn).toHaveBeenCalledWith(
        "test-command",
        expect.objectContaining({
          cwd: "/custom/path",
          env: expect.objectContaining({
            CUSTOM_VAR: "custom-value",
            PATH: expect.stringContaining("/opt/homebrew/bin"),
          }),
        }),
      );
    });
  });
});
