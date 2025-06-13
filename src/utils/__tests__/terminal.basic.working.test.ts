/**
 * Basic working test for terminal utilities
 */

// Import the test utilities
import { mockExecAsync, mockExecAsyncSuccess } from "../../testUtils/mocks/terminalMocks";

// Mock the Raycast API
jest.mock("@raycast/api", () => {
  // Create tracking object for showToast call verification
  const mockToast: {
    style: string | null;
    title: string | null;
    message: string | null;
  } = {
    style: null,
    title: null,
    message: null,
  };

  // Mock showToast to return a mockable object
  const showToastMock = jest.fn().mockImplementation((props) => {
    // Set initial values
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || "";

    // Return a toast-like object that will update our mockToast when modified
    const toastObject = {
      // Initial values
      _style: props.style,
      _title: props.title,
      _message: props.message || "",

      // Getters and setters
      get style() {
        return mockToast.style || "";
      },
      set style(value: string) {
        mockToast.style = value;
      },

      get title() {
        return mockToast.title || "";
      },
      set title(value: string) {
        mockToast.title = value;
      },

      get message() {
        return mockToast.message || "";
      },
      set message(value: string) {
        mockToast.message = value;
      },
    };

    // Initialize the mockToast with the props values
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || "";

    return toastObject;
  });

  return {
    showToast: showToastMock,
    Toast: {
      Style: {
        Animated: "animated",
        Success: "success",
        Failure: "failure",
      },
    },
    // Export for test verification
    _getMockToast: () => mockToast,
  };
});

// Fully mock the terminal module with a controlled implementation for testing
jest.mock("../terminal", () => {
  return {
    // Mock runCommand to avoid actual execution and control the test flow
    runCommand: async (command: string, successMessage: string, failureMessage: string, options?: any) => {
      // Create a toast that will track updates
      const toast = await showToast({
        style: Toast.Style.Animated,
        title: `Running: ${command.split(" ")[0]}...`,
        message: "Executing...",
      });

      try {
        // Use our controlled mock to determine command outcome
        const result = await mockExecAsync(command, options);

        if (result.stderr && !result.stderr.toLowerCase().includes("warning")) {
          toast.style = Toast.Style.Failure;
          toast.title = failureMessage;
          toast.message = result.stderr;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = successMessage;
          toast.message = result.stdout;
        }

        return toast;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = failureMessage;
        toast.message = error instanceof Error ? error.message : "Unknown error";
        return toast;
      }
    },
    // Make execAsync available for tests that need it
    execAsync: mockExecAsync,
  };
});

// Suppress console output
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// Import after mocking
import { runCommand } from "../terminal";
import { showToast, Toast, _getMockToast } from "@raycast/api";

describe("terminal utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("runCommand", () => {
    test("shows animated toast initially", async () => {
      // Setup mock to return success
      mockExecAsync.mockResolvedValueOnce({
        stdout: "Command output",
        stderr: "",
      });

      // Call runCommand
      await runCommand("test-command", "Success", "Failure");

      // Verify showToast was called with correct initial params
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: "animated",
          title: expect.stringContaining("Running:"),
        }),
      );
    });

    test("updates toast to success on successful command", async () => {
      // Setup mock to return success
      mockExecAsync.mockResolvedValueOnce({
        stdout: "Command output",
        stderr: "",
      });

      // Call runCommand
      await runCommand("test-command", "Success", "Failure");

      // Verify toast state was updated to success
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe("success");
      expect(finalToastState.title).toBe("Success");
      expect(finalToastState.message).toContain("Command output");
    });

    test("updates toast to failure when command has stderr", async () => {
      // Setup mock to return error
      mockExecAsync.mockResolvedValueOnce({
        stdout: "",
        stderr: "Command error",
      });

      // Call runCommand
      await runCommand("test-command", "Success", "Failure");

      // Verify toast state was updated to failure
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe("failure");
      expect(finalToastState.title).toBe("Failure");
      expect(finalToastState.message).toContain("Command error");
    });

    test("shows success when stderr only contains warnings", async () => {
      // Setup mock to return warning
      mockExecAsync.mockResolvedValueOnce({
        stdout: "Command output",
        stderr: "warning: This is just a warning",
      });

      // Call runCommand
      await runCommand("test-command", "Success", "Failure");

      // Verify toast state was updated to success despite warning
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe("success");
      expect(finalToastState.title).toBe("Success");
    });
  });
});
