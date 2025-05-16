import { isSonarQubeRunning } from "./utils";
import * as http from "http";

// Mock the http module
jest.mock("http");

describe("utils.ts - branch coverage improvements", () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("isSonarQubeRunning", () => {
    // Mock implementation for http.get that we can control in tests
    function setupMockHttpGet(mockResponse: any, errorType?: string) {
      (http.get as jest.Mock).mockImplementation((options: any, callback: Function) => {
        // Create a mock request object with necessary methods
        const req = {
          on: jest.fn().mockImplementation((event, cb) => {
            // If we're testing an error case
            if (errorType && event === errorType) {
              const error = new Error(errorType === "timeout" ? "Request timed out" : "Network error");
              if (errorType === "error" && errorType !== "timeout") {
                (error as any).code = "ECONNREFUSED";
              }
              setTimeout(() => cb(error), 10);
            }
            return req;
          }),
          destroy: jest.fn()
        };

        // If not an error test, call the callback with the mock response
        if (!errorType) {
          setTimeout(() => callback(mockResponse), 10);
        }
        
        return req;
      });
    }

    it("should return true when SonarQube is running (non-detailed mode)", async () => {
      // Setup mock response for UP status
      const mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            setTimeout(() => callback(JSON.stringify({ status: "UP" })), 10);
          } else if (event === "end") {
            setTimeout(() => callback(), 20);
          }
          return mockResponse;
        })
      };

      setupMockHttpGet(mockResponse);
      
      const result = await isSonarQubeRunning({ detailed: false });
      expect(result).toBe(true);
    });

    it("should return detailed object when SonarQube is running (detailed mode)", async () => {
      // Setup mock response for UP status
      const mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            setTimeout(() => callback(JSON.stringify({ status: "UP" })), 10);
          } else if (event === "end") {
            setTimeout(() => callback(), 20);
          }
          return mockResponse;
        })
      };

      setupMockHttpGet(mockResponse);
      
      const result = await isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: true,
        status: "running",
        details: "SonarQube is running normally"
      });
    });

    it("should return detailed starting status when SonarQube is starting", async () => {
      // Setup mock response for starting status (503)
      const mockResponse = {
        statusCode: 503,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            setTimeout(() => callback("Service unavailable"), 10);
          } else if (event === "end") {
            setTimeout(() => callback(), 20);
          }
          return mockResponse;
        })
      };

      setupMockHttpGet(mockResponse);
      
      const result = await isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up"
      });
    });

    it("should handle ECONNREFUSED error in detailed mode", async () => {
      setupMockHttpGet(null, "error");
      
      const result = await isSonarQubeRunning({ detailed: true, retries: 0 });
      expect(result).toEqual({
        running: false,
        status: "down",
        details: "SonarQube server is not running"
      });
    });

    it("should handle timeout error in detailed mode", async () => {
      setupMockHttpGet(null, "timeout");
      
      const result = await isSonarQubeRunning({ detailed: true, retries: 0 });
      expect(result).toEqual({
        running: false,
        status: "timeout",
        details: "SonarQube server is not responding (may be starting)"
      });
    });

    it("should handle invalid JSON with valid status code", async () => {
      // Setup mock response with valid status but invalid JSON
      const mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") {
            setTimeout(() => callback("Not valid JSON"), 10);
          } else if (event === "end") {
            setTimeout(() => callback(), 20);
          }
          return mockResponse;
        })
      };

      setupMockHttpGet(mockResponse);
      
      const result = await isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: true,
        status: "running",
        details: "SonarQube is running normally"
      });
    });

    it("should handle retry mechanism with eventual success", async () => {
      let callCount = 0;
      
      // Setup http.get to fail twice then succeed
      (http.get as jest.Mock).mockImplementation((options: any, callback: Function) => {
        callCount++;
        
        // Create a request object
        const req = {
          on: jest.fn().mockImplementation((event, cb) => {
            if (callCount <= 2 && event === "error") {
              setTimeout(() => cb(new Error("Temporary failure")), 10);
            }
            return req;
          }),
          destroy: jest.fn()
        };

        // On the third try, return success
        if (callCount > 2) {
          const successResponse = {
            statusCode: 200,
            on: jest.fn().mockImplementation((event, cb) => {
              if (event === "data") {
                setTimeout(() => cb(JSON.stringify({ status: "UP" })), 10);
              } else if (event === "end") {
                setTimeout(() => cb(), 20);
              }
              return successResponse;
            })
          };
          
          setTimeout(() => callback(successResponse), 10);
        }
        
        return req;
      });
      
      // Use global.setTimeout = jest.fn() to control timing in tests
      const originalSetTimeout = global.setTimeout;
      global.setTimeout = jest.fn().mockImplementation((fn, delay) => {
        // Execute immediately to speed up tests
        return originalSetTimeout(fn as TimerHandler, 10) as unknown as NodeJS.Timeout;
      });

      try {
        const result = await isSonarQubeRunning({ detailed: false, retries: 2 });
        expect(result).toBe(true);
        expect(callCount).toBe(3); // Should have tried 3 times
      } finally {
        // Restore original setTimeout
        global.setTimeout = originalSetTimeout;
      }
    });
  });
});
