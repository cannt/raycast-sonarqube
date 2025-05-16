/// <reference types="jest" />

const mockExec = jest.fn(); // Moved to top

jest.unmock("@/utils");
import { showToast, Toast, LocalStorage } from "@raycast/api";
import * as http from "http";
// Import the entire module to avoid potential circular dependencies
import { runCommand, isSonarQubeRunning, generateId, loadProjects, saveProjects, SONARQUBE_PROJECTS_STORAGE_KEY } from "./utils";

// Mock dependencies
jest.mock("@raycast/api", () => ({
  showToast: jest.fn(() => Promise.resolve({
    style: jest.fn(),
    title: jest.fn(),
    message: jest.fn()
  })),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    }
  },
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  }
}));

jest.mock("child_process", () => ({
  exec: mockExec,
}));

// Do not mock 'util' or 'promisify', let the actual 'util.promisify' be used.
// jest.mock("util", () => ({
//   promisify: jest.fn((fn) => fn),
// }));

jest.mock("http", () => {
  const mockEventEmitter = () => {
    const events: Record<string, Function[]> = {};
    return {
      on: jest.fn((event, callback) => {
        events[event] = events[event] || [];
        events[event].push(callback);
        return this;
      }),
      emit: jest.fn((event, ...args) => {
        if (events[event]) {
          events[event].forEach(callback => callback(...args));
        }
      }),
      destroy: jest.fn()
    };
  };

  return {
    get: jest.fn(() => {
      const req = mockEventEmitter();
      return req;
    }),
  };
});

describe("Utils", () => {
  // Save original console functions
  const originalConsoleError = console.error;
  const originalConsoleLog = console.log;

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console functions to prevent actual console output during tests
    console.error = jest.fn();
    console.log = jest.fn();
  });

  afterEach(() => {
    // Restore original console functions
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe("runCommand", () => {
    let mockToastInstance: { style: any; title: string; message: string; hide: jest.Mock<any, any> };

    beforeEach(() => {
      mockToastInstance = { 
        style: Toast.Style.Animated, 
        title: "", 
        message: "", 
        hide: jest.fn()
      };
      (showToast as jest.Mock).mockImplementation((options) => {
        // Update the shared instance's properties
        mockToastInstance.style = options.style;
        mockToastInstance.title = options.title;
        mockToastInstance.message = options.message;
        return Promise.resolve(mockToastInstance); // Return the same instance
      });
    });

    it("should execute a command and show success toast", async () => {
      mockExec.mockImplementation((command: string, opts: any, callback: (error: any, stdout: string, stderr: string) => void) => {
        callback(null, "success", "");
      });

      await runCommand("test-command", "Success", "Failure");

      // Check that showToast was called
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining("Running:"),
      }));

      // Check that command was executed
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining("test-command"),
        expect.any(Object), // options object
        expect.any(Function) // callback
      );

      // Check that toast was updated with success
      expect(mockToastInstance.style).toBe(Toast.Style.Success);
      expect(mockToastInstance.title).toBe("Success");
    });

    it("should handle command failures", async () => {
      mockExec.mockImplementation((command: string, opts: any, callback: (error: any, stdout: string, stderr: string) => void) => {
        callback(new Error("Command failed"), "", "error output");
      });

      await runCommand("test-command", "Success", "Failure");

      // Check that toast was updated with failure
      expect(mockToastInstance.style).toBe(Toast.Style.Failure);
      expect(mockToastInstance.title).toBe("Failure");
      expect(mockToastInstance.message).toContain("Failed to execute 'test-command': Command failed");
    });

    it("should handle exceptions", async () => {
      mockExec.mockImplementation((command: string, opts: any, callback: (error: any, stdout: string, stderr: string) => void) => {
        // To simulate an error caught by 'await execAsync', the callback itself should be called with an error,
        // or exec itself (the mockExec) should throw if promisify handles that.
        // For now, let's make it pass an error to the callback, as this is more typical for exec.
        callback(new Error("Unexpected exec error"), "", "");
      });

      await runCommand("test-command", "Success", "Failure");

      // Check that toast was updated with failure
      expect(mockToastInstance.style).toBe(Toast.Style.Failure);
      expect(mockToastInstance.title).toBe("Failure");
      expect(mockToastInstance.message).toContain("Failed to execute 'test-command': Unexpected exec error");
    });
  });

  describe("isSonarQubeRunning", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return true when SonarQube is running", async () => {
      const mockReqEmitter = {
        listeners: {} as Record<string, jest.Mock>,
        on: jest.fn(function(this: any, event: string, cb: (...args: any[]) => void) { this.listeners[event] = jest.fn(cb); return this; }),
        emit: jest.fn(function(this: any, event: string, ...args: any[]) { if (this.listeners[event]) { this.listeners[event](...args); } }),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResEmitter = {
        statusCode: 200,
        listeners: {} as Record<string, jest.Mock>,
        on: jest.fn(function(this: any, event: string, cb: (...args: any[]) => void) { this.listeners[event] = jest.fn(cb); return this; }),
        emit: jest.fn(function(this: any, event: string, ...args: any[]) { if (this.listeners[event]) { this.listeners[event](...args); } }),
        setEncoding: jest.fn(),
      };

      (http.get as jest.Mock).mockImplementation((urlOrOptions: any, callback?: any) => {
        process.nextTick(() => {
          if (callback) callback(mockResEmitter);
          process.nextTick(() => {
            if (mockResEmitter.listeners["data"]) mockResEmitter.emit("data", Buffer.from(JSON.stringify({ status: "up", version: "9.9" })));
            if (mockResEmitter.listeners["end"]) mockResEmitter.emit("end");
          });
        });
        return mockReqEmitter;
      });

      const result = await isSonarQubeRunning({ detailed: false });
      expect(result).toBe(true);
      expect(http.get).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: "localhost",
          port: 9000,
          path: "/api/system/status",
          method: "GET",
          timeout: 3000, // Default timeout from isSonarQubeRunning
        }),
        expect.any(Function)
      );
      expect(mockResEmitter.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(mockResEmitter.on).toHaveBeenCalledWith("end", expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledWith("timeout", expect.any(Function));
    });

    it("should return detailed status when requested", async () => {
      const mockReqEmitter = {
        listeners: {} as Record<string, jest.Mock>,
        on: jest.fn(function(this: any, event: string, cb: (...args: any[]) => void) { this.listeners[event] = jest.fn(cb); return this; }),
        emit: jest.fn(function(this: any, event: string, ...args: any[]) { if (this.listeners[event]) { this.listeners[event](...args); } }),
        setTimeout: jest.fn(),
        destroy: jest.fn(),
      };

      const mockResEmitter = {
        statusCode: 200,
        listeners: {} as Record<string, jest.Mock>,
        on: jest.fn(function(this: any, event: string, cb: (...args: any[]) => void) { this.listeners[event] = jest.fn(cb); return this; }),
        emit: jest.fn(function(this: any, event: string, ...args: any[]) { if (this.listeners[event]) { this.listeners[event](...args); } }),
        setEncoding: jest.fn(),
      };

      (http.get as jest.Mock).mockImplementation((urlOrOptions: any, callback?: any) => {
        process.nextTick(() => {
          if (callback) callback(mockResEmitter);
          process.nextTick(() => {
            if (mockResEmitter.listeners["data"]) mockResEmitter.emit("data", Buffer.from(JSON.stringify({ status: "up", version: "9.9" })));
            if (mockResEmitter.listeners["end"]) mockResEmitter.emit("end");
          });
        });
        return mockReqEmitter;
      });

      const result = await isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({ running: true, status: "running", details: "SonarQube is running normally" });
      expect(http.get).toHaveBeenCalledWith(
        expect.objectContaining({
          hostname: "localhost",
          port: 9000,
          path: "/api/system/status",
          method: "GET",
          timeout: 3000, // Default timeout from isSonarQubeRunning
        }),
        expect.any(Function)
      );
      expect(mockResEmitter.on).toHaveBeenCalledWith("data", expect.any(Function));
      expect(mockResEmitter.on).toHaveBeenCalledWith("end", expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledWith("timeout", expect.any(Function));
    });    

    it("should return false after retries when SonarQube is not running", async () => {
      // Define the mock request type for error case
      interface MockErrorRequest {
        on: jest.Mock<MockErrorRequest, [string, (error: NodeJS.ErrnoException) => void]>;
        end: jest.Mock;
      }

      // Create the mock request for error case
      const mockRequest: MockErrorRequest = {
        on: jest.fn((event: string, callback: (error: NodeJS.ErrnoException) => void) => {
          if (event === 'error') {
            const error = new Error('connect ECONNREFUSED') as NodeJS.ErrnoException;
            error.code = 'ECONNREFUSED';
            callback(error);
          }
          return mockRequest;
        }),
        end: jest.fn()
      };

      jest.spyOn(http, 'get').mockImplementation(() => mockRequest as any);

      const result = await isSonarQubeRunning({ retries: 1, timeout: 100 });
      expect(result).toBe(false);
    });

    it("should handle request timeout after retries and provide detailed status", async () => {
      let httpGetCallCount = 0;
      const totalAttemptsExpected = 2; // options.retries = 1 means 1 initial + 1 retry

      const mockReqEmitter = {
        _listeners: {} as Record<string, ((...args: any[]) => void) | undefined>,
        on: jest.fn(function(this: any, event: string, cb: (...args: any[]) => void) {
          this._listeners[event] = cb;
          // Simulate timeout by invoking the callback after a microtask if 'timeout' listener is set
          if (event === 'timeout' && typeof this._listeners['timeout'] === 'function') {
            process.nextTick(() => {
              if (typeof this._listeners['timeout'] === 'function') { // Re-check as it might be cleared or changed
                this._listeners['timeout']();
              }
            });
          }
          return this;
        }),
        destroy: jest.fn(),
      };

      // Spy on http.get and mock its implementation for this test
      const httpGetSpy = jest.spyOn(http, 'get').mockImplementation(() => {
        httpGetCallCount++;
        // Reset listeners and mock call counts for each new http.get call (each attempt)
        mockReqEmitter._listeners = {}; 
        mockReqEmitter.on.mockClear();
        mockReqEmitter.destroy.mockClear();
        return mockReqEmitter as any;
      });

      // Test Case 1: detailed: false
      const resultFalse = await isSonarQubeRunning({ retries: 1, timeout: 100, detailed: false });
      expect(resultFalse).toBe(false);
      expect(httpGetCallCount).toBe(totalAttemptsExpected);
      // For each attempt, 'on' is called for 'error' and 'timeout' by checkSonarQubeStatus
      expect(mockReqEmitter.on).toHaveBeenCalledWith('timeout', expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledTimes(2); // For the last attempt
      expect(mockReqEmitter.destroy).toHaveBeenCalledTimes(1); // destroy() called once for the last attempt's timeout

      // Reset counters and spy for the next sub-test
      httpGetCallCount = 0;
      httpGetSpy.mockClear(); // Clears usage data for http.get spy
      // mockReqEmitter mocks are cleared within the spy implementation for each call

      // Test Case 2: detailed: true
      const resultDetailed = await isSonarQubeRunning({ retries: 1, timeout: 100, detailed: true });
      expect(resultDetailed).toEqual({
        running: false,
        status: "timeout",
        details: "SonarQube server is not responding (may be starting)",
      });
      expect(httpGetCallCount).toBe(totalAttemptsExpected);
      expect(mockReqEmitter.on).toHaveBeenCalledWith('timeout', expect.any(Function));
      expect(mockReqEmitter.on).toHaveBeenCalledTimes(2); // For the last attempt
      expect(mockReqEmitter.destroy).toHaveBeenCalledTimes(1); // For the last attempt's timeout

      // Restore the original http.get implementation
      httpGetSpy.mockRestore();
    });
  });

  describe("Project Management", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should generate a unique ID", () => {
      const id = generateId();
      expect(id).toBeTruthy();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });

    it("should load projects from storage", async () => {
      const mockProjects = [
        { id: "1", name: "Project 1", path: "/path/1" },
        { id: "2", name: "Project 2", path: "/path/2" },
      ];
      
      (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(mockProjects));
      
      const projects = await loadProjects();
      expect(projects).toEqual(mockProjects);
      expect(LocalStorage.getItem).toHaveBeenCalledWith(SONARQUBE_PROJECTS_STORAGE_KEY);
    });

    it("should handle invalid JSON when loading projects", async () => {
      (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce("invalid-json");
      
      const projects = await loadProjects();
      expect(projects).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it("should return empty array when no projects are stored", async () => {
      (LocalStorage.getItem as jest.Mock).mockResolvedValueOnce(null);
      
      const projects = await loadProjects();
      expect(projects).toEqual([]);
    });

    it("should save projects to storage", async () => {
      const mockProjects = [
        { id: "1", name: "Project 1", path: "/path/1" },
        { id: "2", name: "Project 2", path: "/path/2" },
      ];
      
      await saveProjects(mockProjects);
      
      expect(LocalStorage.setItem).toHaveBeenCalledWith(
        SONARQUBE_PROJECTS_STORAGE_KEY, 
        JSON.stringify(mockProjects)
      );
    });
  });
});
