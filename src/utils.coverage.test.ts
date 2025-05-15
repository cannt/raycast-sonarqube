import { LocalStorage } from "@raycast/api";
import * as utils from "./utils";
import * as http from "http";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  LocalStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
  },
  showToast: jest.fn(),
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
      Animated: "animated",
    },
  },
}));

// Mock http.get
jest.mock("http", () => ({
  get: jest.fn(),
}));

describe("Utils coverage improvements", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe("loadProjects and saveProjects", () => {
    it("should load projects from localStorage", async () => {
      const mockProjects = [{ id: "1", name: "Test", path: "/test" }];
      (LocalStorage.getItem as jest.Mock).mockResolvedValue(JSON.stringify(mockProjects));
      
      const result = await utils.loadProjects();
      expect(result).toEqual(mockProjects);
    });
    
    it("should handle invalid JSON during loading", async () => {
      (LocalStorage.getItem as jest.Mock).mockResolvedValue("invalid json");
      const result = await utils.loadProjects();
      expect(result).toEqual([]);
    });
    
    it("should save projects to localStorage", async () => {
      const projects = [{ id: "1", name: "Test", path: "/test" }];
      await utils.saveProjects(projects);
      expect(LocalStorage.setItem).toHaveBeenCalledWith(
        utils.SONARQUBE_PROJECTS_STORAGE_KEY, 
        JSON.stringify(projects)
      );
    });
  });
  
  describe("isSonarQubeRunning", () => {
    // Type definitions for http mocks
    type CallbackFn = (...args: any[]) => void;
    interface MockResponse {
      statusCode: number;
      on: jest.Mock;
    }
    interface MockRequest {
      on: jest.Mock;
      destroy: jest.Mock;
    }
    
    // Create a simplified mock implementation for http.get
    const mockHttpResponse = (statusCode: number, responseData: any, errorEvent?: string): void => {
      // Force successful response after retries to avoid hanging tests
      let callCount = 0;
      
      // Mock the http.get function with retry simulation
      (http.get as jest.Mock).mockImplementation((options, responseCallback) => {
        callCount++;
        
        // Create request mock with appropriate handlers
        const mockRequest: MockRequest = {
          on: jest.fn((event: string, callback: CallbackFn): MockRequest => {
            // For error tests, only return error on first call, then succeed
            // This simulates recovery after retry
            if (event === errorEvent && callCount <= 1) {
              setTimeout(() => callback(new Error(errorEvent)), 10);
            }
            return mockRequest;
          }),
          destroy: jest.fn(),
        };
        
        // Create response mock
        const mockResponse: MockResponse = {
          statusCode,
          on: jest.fn((event: string, callback: CallbackFn): MockResponse => {
            if (event === "data") {
              setTimeout(() => {
                callback(typeof responseData === "string" ? responseData : JSON.stringify(responseData));
              }, 10);
            } else if (event === "end") {
              setTimeout(() => callback(), 15);
            }
            return mockResponse;
          }),
        };
        
        // For first call with error event, don't call response callback
        // For subsequent calls or non-error tests, simulate successful response
        if (!(errorEvent && callCount <= 1)) {
          setTimeout(() => responseCallback(mockResponse), 5);
        }
        
        return mockRequest;
      });
    };
    
    it("should return true when SonarQube is up", async () => {
      mockHttpResponse(200, { status: "up" });
      const result = await utils.isSonarQubeRunning();
      expect(result).toBe(true);
    });
    
    it("should return detailed status when SonarQube is up and detailed=true", async () => {
      mockHttpResponse(200, { status: "up" });
      const result = await utils.isSonarQubeRunning({ detailed: true }) as any;
      expect(result.running).toBe(true);
      expect(result.status).toBe("running");
    });
    
    it("should return detailed status when SonarQube is starting and detailed=true", async () => {
      mockHttpResponse(503, { status: "starting" });
      const result = await utils.isSonarQubeRunning({ detailed: true }) as any;
      expect(result.running).toBe(false);
      expect(result.status).toBe("starting");
    });
    
    it("should return false when connection is refused", async () => {
      // Directly mock for connection refused error
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        const mockReq: MockRequest = {
          on: jest.fn((event: string, cb: CallbackFn): MockRequest => {
            if (event === "error") {
              setTimeout(() => cb(new Error("ECONNREFUSED")), 10);
            }
            return mockReq;
          }),
          destroy: jest.fn()
        };
        return mockReq;
      });
      
      const result = await utils.isSonarQubeRunning({ retries: 0 });
      expect(result).toBe(false);
    }, 10000); // Increase timeout
    
    it("should handle detailed response for connection refused", async () => {
      // Directly mock for connection refused error
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        const mockReq: MockRequest = {
          on: jest.fn((event: string, cb: CallbackFn): MockRequest => {
            if (event === "error") {
              setTimeout(() => cb(new Error("ECONNREFUSED")), 10);
            }
            return mockReq;
          }),
          destroy: jest.fn()
        };
        return mockReq;
      });
      
      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 }) as any;
      expect(result.running).toBe(false);
      expect(result.status).toBe("down");
      expect(result.details).toContain("not running");
    }, 10000); // Increase timeout
    
    it("should handle timeout errors", async () => {
      // Direct mock to simulate a timeout response
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        const mockReq: MockRequest = {
          on: jest.fn((event: string, cb: CallbackFn): MockRequest => {
            if (event === "timeout") {
              setTimeout(() => cb(), 10);
            }
            return mockReq;
          }),
          destroy: jest.fn()
        };
        return mockReq;
      });
      
      // Override retries to make test run faster
      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 }) as any;
      expect(result.running).toBe(false);
      // In the actual implementation, timeouts are reported as 'error' status
      expect(result.status).toBe("error");
      expect(result.details).toContain("Request timed out");
    }, 10000); // Increase timeout
    
    it("should handle other error types", async () => {
      // Direct mock to simulate a generic error
      (http.get as jest.Mock).mockImplementation((options, callback) => {
        const mockReq: MockRequest = {
          on: jest.fn((event: string, cb: CallbackFn): MockRequest => {
            if (event === "error") {
              setTimeout(() => cb(new Error("OTHER_ERROR")), 10);
            }
            return mockReq;
          }),
          destroy: jest.fn()
        };
        return mockReq;
      });
      
      // Limit retries for faster test execution
      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 }) as any;
      expect(result.running).toBe(false);
      expect(result.status).toBe("error");
    }, 10000); // Increase timeout
  });
  
  describe("generateId", () => {
    it("should generate a unique string ID", () => {
      const id = utils.generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
