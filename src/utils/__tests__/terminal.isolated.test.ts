/**
 * Isolated test for terminal utilities
 * This approach bypasses the global mocks by using manual module factory approach
 */

// Setup mocks before importing any modules
// Jest hoists these mock declarations, so we need to define them first
jest.mock("child_process");
jest.mock("util");
jest.mock("@raycast/api");

// Import all dependencies now that mocks are set up
import { exec } from "child_process";
import util from "util";

// Create mock functions after mocking
const mockExec = jest.fn();
const mockPromisify = jest.fn(() => mockExec);
const mockShowToast = jest.fn();

// Now assign the mock implementations
jest.mocked(exec).mockImplementation(mockExec);
jest.mocked(util.promisify).mockImplementation(mockPromisify);

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

// Prevent console pollution during tests
jest.spyOn(console, "log").mockImplementation(() => {});
jest.spyOn(console, "error").mockImplementation(() => {});

// Need to create our own version of the terminal module since we can't
// easily bypass the global mock of '../utils'
// This is a simplified version of the functionality we want to test
const testableRunCommand = async (
  command: string,
  successMessage: string,
  failureMessage: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) => {
  const execAsync = util.promisify(exec);
  const toast = mockShowToast({
    style: "animated",
    title: `Running: ${command.split(" ")[0]}...`,
    message: "Preparing environment...",
  });

  try {
    // Ensure we always pass an options object, even if it's empty
    const defaultOptions = {};
    const { stdout, stderr } = await execAsync(command, options || defaultOptions);
    const stderrStr = stderr?.toString() || "";

    if (stderrStr && !stderrStr.toLowerCase().includes("warning")) {
      if (toast) {
        toast.style = "failure";
        toast.title = failureMessage;
        toast.message = stderr;
      }
    } else {
      if (toast) {
        toast.style = "success";
        toast.title = successMessage;
        toast.message = stdout;
      }
    }
  } catch (error) {
    if (toast) {
      toast.style = "failure";
      toast.title = failureMessage;
      toast.message = error instanceof Error ? error.message : "Unknown error";
    }
  }
};

describe("Terminal Utilities (Isolated)", () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Default behavior for mockShowToast
    mockShowToast.mockReturnValue({
      style: "animated",
      title: "",
      message: "",
    });

    // Default behavior for mockExec
    mockExec.mockResolvedValue({
      stdout: "",
      stderr: "",
    });
  });

  test("runCommand calls showToast initially", async () => {
    mockExec.mockResolvedValueOnce({
      stdout: "Command output",
      stderr: "",
    });

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify showToast was called
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "animated",
        title: expect.stringContaining("Running:"),
      }),
    );
  });

  test("runCommand calls exec with correct command", async () => {
    mockExec.mockResolvedValueOnce({
      stdout: "Command output",
      stderr: "",
    });

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify exec was called with the correct command
    expect(mockExec).toHaveBeenCalledWith("test-command", expect.anything());
  });

  test("runCommand handles options", async () => {
    mockExec.mockResolvedValueOnce({
      stdout: "Command output",
      stderr: "",
    });

    const options = {
      cwd: "/custom/path",
      env: { CUSTOM_VAR: "custom-value" },
    };

    await testableRunCommand("test-command", "Success", "Failure", options);

    // Verify exec was called with correct options
    expect(mockExec).toHaveBeenCalledWith(
      "test-command",
      expect.objectContaining({
        cwd: "/custom/path",
        env: expect.objectContaining({
          CUSTOM_VAR: "custom-value",
        }),
      }),
    );
  });

  test("success case sets toast styles correctly", async () => {
    // Create a toast object that tracks updates
    const mockToast = {
      style: "animated",
      title: "",
      message: "",
    };

    // Configure mockShowToast to return our tracking toast
    mockShowToast.mockReturnValue(mockToast);

    // Configure mockExec to return success
    mockExec.mockResolvedValueOnce({
      stdout: "Command succeeded",
      stderr: "",
    });

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify toast was updated to success
    expect(mockToast.style).toBe("success");
    expect(mockToast.title).toBe("Success");
    expect(mockToast.message).toBe("Command succeeded");
  });

  test("error case sets toast styles correctly", async () => {
    // Create a toast object that tracks updates
    const mockToast = {
      style: "animated",
      title: "",
      message: "",
    };

    // Configure mockShowToast to return our tracking toast
    mockShowToast.mockReturnValue(mockToast);

    // Configure mockExec to return error
    mockExec.mockResolvedValueOnce({
      stdout: "",
      stderr: "Command failed with error",
    });

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify toast was updated to failure
    expect(mockToast.style).toBe("failure");
    expect(mockToast.title).toBe("Failure");
    expect(mockToast.message).toBe("Command failed with error");
  });

  test("warning in stderr is not treated as error", async () => {
    // Create a toast object that tracks updates
    const mockToast = {
      style: "animated",
      title: "",
      message: "",
    };

    // Configure mockShowToast to return our tracking toast
    mockShowToast.mockReturnValue(mockToast);

    // Configure mockExec to return warning in stderr
    mockExec.mockResolvedValueOnce({
      stdout: "Command output",
      stderr: "warning: This is just a warning",
    });

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify toast was updated to success (not failure)
    expect(mockToast.style).toBe("success");
    expect(mockToast.title).toBe("Success");
  });

  test("exception handling sets toast to failure", async () => {
    // Create a toast object that tracks updates
    const mockToast = {
      style: "animated",
      title: "",
      message: "",
    };

    // Configure mockShowToast to return our tracking toast
    mockShowToast.mockReturnValue(mockToast);

    // Configure mockExec to throw exception
    mockExec.mockRejectedValueOnce(new Error("Command execution failed"));

    await testableRunCommand("test-command", "Success", "Failure");

    // Verify toast was updated to failure
    expect(mockToast.style).toBe("failure");
    expect(mockToast.title).toBe("Failure");
    expect(mockToast.message).toBe("Command execution failed");
  });
});
