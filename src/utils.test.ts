import { showToast, Toast } from "@raycast/api";
import * as child_process from "child_process";
import * as http from "http";
import { 
  runCommand, 
  runInNewTerminal, 
  isSonarQubeRunning, 
  execAsync, 
  generateId 
} from "./utils";

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
  },
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn()
  },
  environment: {
    supportPath: "/test/support/path"
  }
}));

// Mock the child_process.exec
jest.mock("child_process", () => ({
  exec: jest.fn((cmd, opts, callback) => {
    if (callback) callback(null, { stdout: "mock stdout", stderr: "" });
    return { stdout: "mock stdout", stderr: "" };
  })
}));

// Mock utilities to make testing easier
jest.mock("http", () => {
  return {
    get: jest.fn()
  };
});

// Set up http get mock with default behavior
const httpGetMock = http.get as jest.Mock;

describe("runCommand", () => {
  let mockToast: { title: string; message: string; style: string; show: () => void; hide: () => void };
  let mockExec: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockToast = {
      title: "",
      message: "",
      style: "",
      show: jest.fn(),
      hide: jest.fn()
    };
    
    // Mock showToast to return our toast object
    (showToast as jest.Mock).mockResolvedValue(mockToast);
    
    // Set up exec mock with success by default
    mockExec = jest.fn((cmd, opts, callback) => {
      if (callback) callback(null, { stdout: "success output", stderr: "" });
      return Promise.resolve({ stdout: "success output", stderr: "" });
    });
    
    // Replace the exec implementation
    (child_process.exec as unknown as jest.Mock).mockImplementation(mockExec);
  });

  it("should show success message on successful command", async () => {
    await runCommand("test command", "Success", "Failure");
    
    // Verify the toast was updated with success style
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe("Success");
  });

  it("should show failure message on command error", async () => {
    // Set up exec to simulate an error
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) callback(new Error("Command failed"), "", "Error output");
      return { stdout: "", stderr: "Error output" };
    });
    
    await runCommand("test command", "Success", "Failure");
    
    // Verify the toast was updated with failure style
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe("Failure");
  });

  it("should show failure on stderr even without error", async () => {
    // Set up exec to return stderr but no error
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) callback(null, { stdout: "", stderr: "Error in command" });
      return Promise.resolve({ stdout: "", stderr: "Error in command" });
    });
    
    await runCommand("test command", "Success", "Failure");
    
    // Verify the toast was updated with failure style
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe("Failure");
  });

  it("should handle warning stderr with success", async () => {
    // Set up exec to return stderr with warning
    mockExec.mockImplementation((cmd, opts, callback) => {
      if (callback) callback(null, { stdout: "success output", stderr: "warning: some warning" });
      return Promise.resolve({ stdout: "success output", stderr: "warning: some warning" });
    });
    
    await runCommand("test command", "Success", "Failure");
    
    // Verify the toast shows success despite the warning
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe("Success");
  });

  it("should handle environment paths", async () => {
    await runCommand("test command", "Success", "Failure");
    
    // Verify the command was executed
    expect(mockExec).toHaveBeenCalled();
    
    // Verify it was called with the right command string
    expect(mockExec.mock.calls[0][0]).toBe("test command");
    
    // Verify it contains the expected PATH
    const options = mockExec.mock.calls[0][1];
    expect(options.env.PATH).toContain("/opt/podman/bin:/opt/homebrew/bin");
  });
});

// Note: runInNewTerminal tests have been moved to utils.terminal.test.ts

describe("isSonarQubeRunning", () => {
  // Mock for successful HTTP response
  function mockHttpSuccess() {
    const mockResponse = {
      statusCode: 200,
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === 'data') {
          callback(JSON.stringify({ status: "up" }));
        } else if (event === 'end') {
          callback();
        }
        return mockResponse;
      })
    };
    
    const mockReq = {
      on: jest.fn().mockReturnThis(),
      destroy: jest.fn()
    };
    
    httpGetMock.mockImplementation((options, callback) => {
      callback(mockResponse);
      return mockReq;
    });
  }
  
  // Mock for failed HTTP response
  function mockHttpError(errorType: string) {
    const mockReq = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === errorType) {
          callback(new Error(errorType));
        }
        return mockReq;
      }),
      destroy: jest.fn()
    };
    
    httpGetMock.mockReturnValue(mockReq);
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true for successful response", async () => {
    mockHttpSuccess();
    
    const running = await isSonarQubeRunning();
    
    expect(running).toBe(true);
    expect(httpGetMock).toHaveBeenCalled();
  });

  it("should return detailed status for successful response", async () => {
    mockHttpSuccess();
    
    const detailedStatus = await isSonarQubeRunning({ detailed: true });
    
    expect(detailedStatus).toMatchObject({
      running: true,
      status: "running"
    });
  });

  it("should return false for error response", async () => {
    mockHttpError("error");
    
    const running = await isSonarQubeRunning();
    
    expect(running).toBe(false);
  });

  it("should return detailed status for error response", async () => {
    mockHttpError("error");
    
    const detailedStatus = await isSonarQubeRunning({ detailed: true });
    expect(detailedStatus).toMatchObject({
      running: false,
      status: "error" // Updated to match our enhanced implementation
    });
  });

  it("should resolve to false on timeout", async () => {
    // Create a mock that triggers a timeout event
    const mockReq = {
      on: jest.fn().mockImplementation((event, callback) => {
        if (event === "timeout") {
          setTimeout(() => callback(), 10);
        }
        return mockReq;
      }),
      destroy: jest.fn()
    };
    
    httpGetMock.mockReturnValue(mockReq);
    
    // Call with short timeout and no retries
    const result = await isSonarQubeRunning({ timeout: 100, retries: 0 });
    
    // Should return false on timeout
    expect(result).toBe(false);
  });

  it("should support retries when specified", async () => {
    // First call will trigger error, second call will succeed
    let callCount = 0;
    
    httpGetMock.mockImplementation((options, callback) => {
      callCount++;
      
      if (callCount === 1) {
        // First call - return error
        const errorReq = {
          on: jest.fn().mockImplementation((event, cb) => {
            if (event === "error") {
              setTimeout(() => cb(new Error("First attempt failed")), 10);
            }
            return errorReq;
          }),
          destroy: jest.fn()
        };
        return errorReq;
      } else {
        // Subsequent calls - return success
        const successReq = {
          on: jest.fn().mockReturnThis(),
          destroy: jest.fn()
        };
        
        const successRes = {
          statusCode: 200,
          on: jest.fn().mockImplementation((event, cb) => {
            if (event === 'data') {
              cb(JSON.stringify({ status: "up" }));
            } else if (event === 'end') {
              cb();
            }
            return successRes;
          })
        };
        
        // Callback with success response
        setTimeout(() => callback(successRes), 10);
        return successReq;
      }
    });
    
    // Call with 1 retry
    const result = await isSonarQubeRunning({ retries: 1 });
    
    // Should retry and eventually succeed
    expect(callCount).toBe(2);
    expect(result).toBe(true);
  });
});

describe("generateId", () => {
  it("should generate a string id", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });
});
