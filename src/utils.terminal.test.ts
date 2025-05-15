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
      if (callback) callback(null, { stdout: "mock stdout", stderr: "" });
      return { stdout: "mock stdout", stderr: "" };
    });
    
    // Replace the exec implementation
    (child_process.exec as unknown as jest.Mock).mockImplementation(mockExec);
  });

  // Set a long timeout for all tests in this suite
  jest.setTimeout(30000);

  it.skip("should execute AppleScript with commands", async () => {
    const commands = ["echo hello", "echo world"];
    await runInNewTerminal(commands, "Success", "Failure");
    
    // Check that exec was called
    expect(mockExec).toHaveBeenCalled();
    
    // Verify the command has AppleScript
    const execCommand = mockExec.mock.calls[0][0];
    expect(execCommand).toContain("osascript");
    expect(execCommand).toContain("tell application \"Terminal\"");
  });

  it.skip("should show success toast on successful execution", async () => {
    await runInNewTerminal(["echo test"], "Success", "Failure");
    
    // Wait for the toast to be shown
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify toast shows success
    expect(mockToast.style).toBe(Toast.Style.Success);
  });

  it.skip("should show failure toast on execution error", async () => {
    // Set up exec to simulate an error
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) callback(new Error("AppleScript failed"), { stdout: "", stderr: "Error" }, "Error");
      return { stdout: "", stderr: "Error" };
    });
    
    await runInNewTerminal(["echo test"], "Success", "Failure");
    
    // Wait for the toast to be shown
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify toast shows failure
    expect(mockToast.style).toBe(Toast.Style.Failure);
  });

  it.skip("should apply progress tracking when requested", async () => {
    const options = { trackProgress: true };
    
    await runInNewTerminal(["echo test"], "Success", "Failure", options);
    
    // Verify showToast was called with animated style
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "animated"
    }));
  });

  it.skip("should escape quotes in commands", async () => {
    const commands = ["echo \"quoted text\""];
    
    await runInNewTerminal(commands, "Success", "Failure");
    
    // Check that quotes were escaped in the AppleScript
    const execCommand = mockExec.mock.calls[0][0];
    expect(execCommand).toContain("echo \\\"quoted text\\\"");
  });
});
