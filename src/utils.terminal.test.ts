import { showToast, Toast } from "@raycast/api";
import * as child_process from "child_process";
import { runInNewTerminal } from "./utils";

// Mock modules and functions
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockResolvedValue({
    title: "",
    message: "",
    show: jest.fn(),
    hide: jest.fn(),
    style: ""
  }),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure"
    }
  }
}));

// Mock the child_process.exec
jest.mock("child_process", () => ({
  exec: jest.fn((cmd, opts, callback) => {
    // Just immediately call the callback with success
    if (callback) callback(null, { stdout: "mock stdout", stderr: "" });
    return { stdout: "mock stdout", stderr: "" };
  })
}));

describe("runInNewTerminal", () => {
  let mockExec: jest.Mock;
  let mockToast: { title: string; message: string; style: string; show: () => void; hide: () => void };
  
  // Create spy on showToast directly to verify it's called with the right parameters
  const showToastSpy = jest.spyOn(require("@raycast/api"), "showToast");

  // Mock function to check if toast was called with title containing string
  const mockToastTitleCalledWith = (str: string) => {
    return (showToast as jest.Mock).mock.calls.some(
      (call) => call[0].title && call[0].title.includes(str)
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock toast
    mockToast = {
      title: "",
      message: "",
      style: "",
      show: jest.fn(),
      hide: jest.fn()
    };
    (showToast as jest.Mock).mockResolvedValue(mockToast);
    
    // Set up a mock that will immediately call the callback
    mockExec = jest.fn((cmd, opts, callback) => {
      // Immediately resolve the callback to avoid timeout issues
      if (callback) {
        setTimeout(() => {
          callback(null, { stdout: "mock stdout", stderr: "" });
        }, 0);
      }
      return { stdout: "mock stdout", stderr: "" };
    });
    
    // Replace the exec implementation
    (child_process.exec as unknown as jest.Mock).mockImplementation(mockExec);
  });

  // Increase timeout for all tests in this suite
  jest.setTimeout(10000);

  it("should execute AppleScript with commands", async () => {
    const commands = ["echo hello", "echo world"];
    
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Create a promise that resolves immediately to avoid timeout
    const execPromise = Promise.resolve({ stdout: "success", stderr: "" });
    mockExec.mockReturnValueOnce(execPromise);
    
    await runInNewTerminal(commands, "Success", "Failure");
    
    // Check that exec was called
    expect(mockExec).toHaveBeenCalled();
    
    // Verify the command has AppleScript
    const execCommand = mockExec.mock.calls[0][0];
    expect(execCommand).toContain("osascript");
    expect(execCommand).toContain("tell application \"Terminal\"");
  });

  it("should show success toast on successful execution", async () => {
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Create a promise that resolves immediately to avoid timeout
    const execPromise = Promise.resolve({ stdout: "success", stderr: "" });
    mockExec.mockReturnValueOnce(execPromise);
    
    await runInNewTerminal(["echo test"], "Success", "Failure");
    
    // Verify toast shows success
    expect(mockToast.style).toBe(Toast.Style.Success);
  });

  it("should show failure toast on execution error", async () => {
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Set up exec to simulate an error
    mockExec.mockImplementationOnce((cmd, opts, callback) => {
      if (callback) {
        callback(new Error("AppleScript failed"), { stdout: "", stderr: "Error" }, "Error");
      }
      return { stdout: "", stderr: "Error" };
    });
    
    await runInNewTerminal(["echo test"], "Success", "Failure");
    
    // Verify toast shows failure
    expect(mockToast.style).toBe(Toast.Style.Failure);
  });

  it("should apply progress tracking when requested", async () => {
    const options = { trackProgress: true };
    
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Create a promise that resolves immediately to avoid timeout
    const execPromise = Promise.resolve({ stdout: "success", stderr: "" });
    mockExec.mockReturnValueOnce(execPromise);
    
    await runInNewTerminal(["echo test"], "Success", "Failure", options);
    
    // Verify showToast was called with animated style
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "animated"
    }));
  });

  it("should escape quotes in commands", async () => {
    const commands = ["echo \"quoted text\""];
    
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Create a promise that resolves immediately to avoid timeout
    const execPromise = Promise.resolve({ stdout: "success", stderr: "" });
    mockExec.mockReturnValueOnce(execPromise);
    
    await runInNewTerminal(commands, "Success", "Failure");
    
    // Check that quotes were escaped in the AppleScript
    const execCommand = mockExec.mock.calls[0][0];
    expect(execCommand).toContain("echo \\\"quoted text\\\"");
  });

  // Specific test to cover lines 183-185 in utils.ts
  it("should show animated toast when launching terminal", async () => {
    // Clear previous calls
    (showToast as jest.Mock).mockClear();
    
    // Mock the toast directly to avoid waiting
    (showToast as jest.Mock).mockImplementationOnce(() => {
      return Promise.resolve(mockToast);
    });
    
    // Create a promise that resolves immediately to avoid timeout
    const execPromise = Promise.resolve({ stdout: "success", stderr: "" });
    mockExec.mockReturnValueOnce(execPromise);
    
    // Start a terminal operation
    const operationPromise = runInNewTerminal(["echo test"], "Success", "Failure");
    
    // Verify that showToast is called with the right parameters
    // This covers lines 183-185 in utils.ts
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: Toast.Style.Animated,
      title: "Launching Terminal",
      message: expect.stringContaining("Preparing to run")
    }));
    
    // Wait for operation to complete
    await operationPromise;
  });
});
