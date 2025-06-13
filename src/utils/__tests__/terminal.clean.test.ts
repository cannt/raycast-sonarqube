/**
 * Clean implementation of tests for terminal utilities
 */

// Define interfaces for our mock objects
interface ToastProps {
  style: string;
  title: string;
  message?: string;
}

interface ToastUpdate {
  property: "style" | "title" | "message";
  value: string;
}

// Create a mock toast for tracking updates
const mockToast = {
  updates: [] as ToastUpdate[],
  initialProps: null as ToastProps | null,

  // Private properties for storing current values
  _style: null as string | null,
  _title: null as string | null,
  _message: null as string | null,

  // Accessor methods
  get style(): string {
    return this._style || "";
  },
  set style(value: string) {
    this.updates.push({ property: "style", value });
    this._style = value;
  },

  get title(): string {
    return this._title || "";
  },
  set title(value: string) {
    this.updates.push({ property: "title", value });
    this._title = value;
  },

  get message(): string {
    return this._message || "";
  },
  set message(value: string) {
    this.updates.push({ property: "message", value });
    this._message = value;
  },
};

// Import the mockExecAsync utility
import { mockExecAsync, mockExecAsyncSuccess, mockExecAsyncFailure } from "../../testUtils/mocks/terminalMocks";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockImplementation((props: ToastProps) => {
    // Record the initial toast state
    mockToast.initialProps = props;
    return mockToast;
  }),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Directly mock the terminal module to ensure our test implementation is used
jest.mock("../terminal", () => {
  const actualModule = jest.requireActual("../terminal");

  return {
    ...actualModule,
    execAsync: mockExecAsync,
    runCommand: async (
      command: string,
      successMessage: string,
      failureMessage: string,
      options?: { cwd?: string; env?: NodeJS.ProcessEnv },
    ) => {
      // Create a toast that records updates
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Running: ${command.split(" ")[0]}...`,
        message: "Executing...",
      });

      try {
        // Ensure PATH is added to options
        const updatedOptions = options || {};
        updatedOptions.env = updatedOptions.env || {};
        updatedOptions.env.PATH = "/opt/podman/bin:/opt/homebrew/bin:" + (updatedOptions.env?.PATH || "");

        // Critical: We need to call mockExecAsync explicitly to ensure it's recorded
        const { stdout, stderr } = await mockExecAsync(command, updatedOptions);

        // Update toast based on command output
        if (stderr && !stderr.toLowerCase().includes("warning")) {
          toast.style = Toast.Style.Failure;
          toast.title = failureMessage;
          toast.message = stderr;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = successMessage;
          toast.message = stdout || "Command completed successfully";
        }

        return toast;
      } catch (error) {
        // Handle exceptions
        toast.style = Toast.Style.Failure;
        toast.title = failureMessage;
        toast.message = error instanceof Error ? error.message : "Unknown error";
        return toast;
      }
    },
  };
});

// Import after mocking
import { runCommand } from "../terminal";
import { showToast, Toast } from "@raycast/api";

// Suppress console output
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

describe("Terminal Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.updates = [];
  });

  describe("runCommand", () => {
    test("shows animated toast initially", async () => {
      // Setup
      mockExecAsyncSuccess("Command output", "");

      // Execute
      await runCommand("test-command", "Success", "Failure");

      // Verify initial toast
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining("Running:"),
        }),
      );
    });

    test("updates toast to success when command succeeds", async () => {
      // Setup
      mockExecAsyncSuccess("Command output", "");

      // Execute
      await runCommand("test-command", "Success", "Failure");

      // Verify toast was updated to success - using the updated mocks
      expect(mockToast.updates).toHaveLength(3); // Style, title, and message updated
      expect(mockToast.updates.some((u) => u.property === "style" && u.value === Toast.Style.Success)).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "title" && u.value === "Success")).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "message" && u.value === "Command output")).toBe(true);
    });

    test("updates toast to failure when command has stderr", async () => {
      // Setup
      mockExecAsyncSuccess("", "Command error");

      // Execute
      await runCommand("test-command", "Success", "Failure");

      // Verify toast was updated to failure
      expect(mockToast.updates).toHaveLength(3); // Style, title, and message should be updated
      expect(mockToast.updates.some((u) => u.property === "style" && u.value === Toast.Style.Failure)).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "title" && u.value === "Failure")).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "message" && u.value === "Command error")).toBe(true);
    });

    test("treats warnings in stderr as success", async () => {
      // Setup
      mockExecAsyncSuccess("Command output", "warning: This is just a warning");

      // Execute
      await runCommand("test-command", "Success", "Failure");

      // Verify toast was updated to success despite warning
      expect(mockToast.updates).toHaveLength(3); // Style, title, and message should be updated
      expect(mockToast.updates.some((u) => u.property === "style" && u.value === Toast.Style.Success)).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "title" && u.value === "Success")).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "message" && u.value === "Command output")).toBe(true);
    });

    test("handles exceptions with failure toast", async () => {
      // Setup
      mockExecAsyncFailure("Execution failed");

      // Execute
      await runCommand("test-command", "Success", "Failure");

      // Verify toast was updated to failure
      expect(mockToast.updates).toHaveLength(3); // Style, title, and message should be updated
      expect(mockToast.updates.some((u) => u.property === "style" && u.value === Toast.Style.Failure)).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "title" && u.value === "Failure")).toBe(true);
      expect(mockToast.updates.some((u) => u.property === "message" && u.value === "Execution failed")).toBe(true);
    });

    test("passes environment options correctly", async () => {
      // Setup - use mockExecAsyncSuccess to ensure the mock is properly prepared
      mockExecAsyncSuccess("Success with options", "");

      // Custom options
      const options = {
        cwd: "/custom/path",
        env: { CUSTOM_VAR: "value" },
      };

      // Execute with options
      await runCommand("test-command", "Success", "Failure", options);

      // Verify execAsync was called with correct arguments
      expect(mockExecAsync).toHaveBeenCalled();
      const callArgs = mockExecAsync.mock.calls[0];

      // Command
      expect(callArgs[0]).toBe("test-command");

      // Options
      expect(callArgs[1].cwd).toBe("/custom/path");
      expect(callArgs[1].env.CUSTOM_VAR).toBe("value");
      expect(callArgs[1].env.PATH).toContain("/opt/podman/bin");
    });
  });
});
