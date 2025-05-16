/// <reference types="jest" />
import { showToast, Toast, LocalStorage } from "@raycast/api";
import * as http from "http";
import {
  SONARQUBE_PROJECTS_STORAGE_KEY,
  runCommand,
  isSonarQubeRunning,
  generateId,
  loadProjects,
  saveProjects
} from "./utils";

// Need to define mocks before imports to avoid hoisting issues
const mockExec = jest.fn();

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

jest.mock("util", () => ({
  promisify: jest.fn((fn) => fn),
}));

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
    const mockToast = {
      style: "",
      title: "",
      message: "",
    };

    beforeEach(() => {
      (showToast as jest.Mock).mockResolvedValue(mockToast);
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
          opts = {};
        }
        // Pass directly to callback
        return callback(null, { stdout: "success output", stderr: "" });
      });
    });

    it("should execute a command and show success toast", async () => {
      await runCommand("test-command", "Success", "Failure");

      // Check that showToast was called
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
        style: Toast.Style.Animated,
        title: "Running: test-command...",
      }));

      // Check that exec was called with the right arguments
      expect(mockExec).toHaveBeenCalledWith(
        "test-command",
        expect.objectContaining({
          env: expect.objectContaining({
            PATH: expect.stringContaining("/opt/podman/bin:/opt/homebrew/bin")
          })
        }), 
        expect.any(Function)
      );

      // Check that toast was updated with success
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe("Success");
    });

    it("should handle command failures", async () => {
      // Mock exec to simulate failure
      mockExec.mockImplementation((cmd, opts, callback) => {
        if (typeof opts === 'function') {
          callback = opts;
          opts = {};
        }
        return callback(null, { stdout: "", stderr: "permission denied" });
      });

      await runCommand("test-command", "Success", "Failure");

      // Check that toast was updated with failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe("Failure");
      expect(mockToast.message).toContain("permission denied");
    });

    it("should handle exceptions", async () => {
      // Mock exec to throw an error
      mockExec.mockImplementation(() => {
        throw new Error("Execution error");
      });

      await runCommand("test-command", "Success", "Failure");

      // Check that toast was updated with failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe("Failure");
      expect(mockToast.message).toContain("Error executing command");
    });
  });

  describe("isSonarQubeRunning", () => {
    beforeEach(() => {
      jest.resetAllMocks();
      jest.clearAllMocks();
      mockExec.mockReset();
    });

    it("should return true when SonarQube is running", async () => {
      // Mock HTTP response for successful check
      const mockReq = { on: jest.fn(), destroy: jest.fn() };
      const mockRes: any = { 
        on: jest.fn((event: string, callback: Function): any => {
          if (event === 'end') {
            callback();
          } else if (event === 'data') {
            callback('{\'status\':\'up\'}');
          }
          return mockRes;
        }),
        statusCode: 200
      };
      
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const result = await isSonarQubeRunning();
      expect(result).toBe(true);
    });

    it("should return detailed status when requested", async () => {
      // Mock HTTP response for successful check
      const mockReq = { on: jest.fn(), destroy: jest.fn() };
      const mockRes: any = { 
        on: jest.fn((event: string, callback: Function): any => {
          if (event === 'end') {
            callback();
          } else if (event === 'data') {
            callback('{\'status\':\'up\'}');
          }
          return mockRes;
        }),
        statusCode: 200
      };
      
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        callback(mockRes);
        return mockReq;
      });

      const result = await isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({ 
        running: true, 
        status: "running", 
        details: "SonarQube is running normally" 
      });
    });

    it("should return false after retries when SonarQube is not running", async () => {
      // Mock HTTP request to simulate error
      const mockReq: any = { 
        on: jest.fn((event: string, callback: Function): any => {
          if (event === 'error') {
            callback(new Error("ECONNREFUSED"));
          }
          return mockReq;
        }),
        destroy: jest.fn()
      };
      
      (http.get as jest.Mock).mockReturnValue(mockReq);

      const result = await isSonarQubeRunning({ retries: 1, timeout: 100 });
      expect(result).toBe(false);
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
        { id: "2", name: "Project 2", path: "/path/2" }
      ];
      
      (LocalStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockProjects));
      
      const projects = await loadProjects();
      expect(projects).toEqual(mockProjects);
      expect(LocalStorage.getItem).toHaveBeenCalledWith(SONARQUBE_PROJECTS_STORAGE_KEY);
    });

    it("should handle invalid JSON when loading projects", async () => {
      (LocalStorage.getItem as jest.Mock).mockResolvedValue("invalid-json");
      
      const projects = await loadProjects();
      expect(projects).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it("should return empty array when no projects are stored", async () => {
      (LocalStorage.getItem as jest.Mock).mockResolvedValue(null);
      
      const projects = await utils.loadProjects();
      expect(projects).toEqual([]);
    });

    it("should save projects to storage", async () => {
      const mockProjects = [
        { id: "1", name: "Project 1", path: "/path/1" },
        { id: "2", name: "Project 2", path: "/path/2" }
      ];
      
      await saveProjects(mockProjects);
      
      expect(LocalStorage.setItem).toHaveBeenCalledWith(
        SONARQUBE_PROJECTS_STORAGE_KEY, 
        JSON.stringify(mockProjects)
      );
    });
  });
});
