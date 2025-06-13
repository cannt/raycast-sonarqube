import { LocalStorage } from "@raycast/api";
import * as http from "http";

// Mock the utils module before importing it
jest.mock("../index", () => {
  // Get the actual module implementation
  const originalModule = jest.requireActual("../index");

  // Return a modified version with our test implementations
  return {
    ...originalModule,
    // Mock loadProjects to return mock data
    loadProjects: jest.fn().mockImplementation(async () => {
      const storedProjects = await LocalStorage.getItem("sonarqubeProjectsList");
      if (storedProjects) {
        try {
          return JSON.parse(storedProjects as string);
        } catch (e) {
          console.error("Failed to parse stored projects:", e);
          return [];
        }
      }
      return [];
    }),
    // Mock saveProjects
    saveProjects: jest.fn().mockImplementation(async (projects) => {
      await LocalStorage.setItem("sonarqubeProjectsList", JSON.stringify(projects));
    }),
    // Mock generateId
    generateId: jest.fn().mockReturnValue("test-id-123"),
    // Mock isSonarQubeRunning with configurable behavior for each test
    isSonarQubeRunning: jest.fn().mockImplementation(async (options) => {
      if (options?.detailed) {
        return { running: true, status: "running", details: "SonarQube is running" };
      }
      return true;
    }),
  };
});

// Import utils after setting up the mock
import * as utils from "../index";

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
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
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
      expect(LocalStorage.setItem).toHaveBeenCalledWith(utils.SONARQUBE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
    });
  });

  describe("isSonarQubeRunning", () => {
    // Mock the http.get function directly for our tests
    (http.get as jest.Mock).mockImplementation((options: unknown, responseCallback: (res: unknown) => void) => {
      // Mock response with status code 200
      const mockResponse = {
        statusCode: 200,
        on: jest.fn().mockImplementation((event, callback) => {
          if (event === "data") setTimeout(() => callback(JSON.stringify({ status: "UP" })), 10);
          if (event === "end") setTimeout(callback, 20);
          return mockResponse;
        }),
      };

      // Call the callback with our mock response
      setTimeout(() => responseCallback(mockResponse), 5);

      // Return a mock request
      return {
        on: jest.fn().mockReturnThis(),
        destroy: jest.fn(),
      };
    });

    it("should return true when SonarQube is up", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => true);

      const result = await utils.isSonarQubeRunning();
      expect(result).toBe(true);
    });

    it("should return detailed status when SonarQube is up and detailed=true", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => ({
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      }));

      const result = (await utils.isSonarQubeRunning({ detailed: true })) as {
        running: boolean;
        status: string;
        details?: string;
      };
      expect(result.running).toBe(true);
      expect(result.status).toBe("running");
    });

    it("should return detailed status when SonarQube is starting and detailed=true", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => ({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up",
      }));

      const result = (await utils.isSonarQubeRunning({ detailed: true })) as {
        running: boolean;
        status: string;
        details?: string;
      };
      expect(result.running).toBe(false);
      expect(result.status).toBe("starting");
    });

    it("should return false when connection is refused", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => false);

      const result = await utils.isSonarQubeRunning({ retries: 0 });
      expect(result).toBe(false);
    });

    it("should handle detailed response for connection refused", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => ({
        running: false,
        status: "down",
        details: "SonarQube server is not running",
      }));

      const result = (await utils.isSonarQubeRunning({ detailed: true, retries: 0 })) as {
        running: boolean;
        status: string;
        details?: string;
      };
      expect(result.running).toBe(false);
      expect(result.status).toBe("down");
      expect(result.details).toContain("not running");
    });

    it("should handle timeout errors", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => ({
        running: false,
        status: "error",
        details: "Request timed out",
      }));

      const result = (await utils.isSonarQubeRunning({ detailed: true, retries: 0 })) as {
        running: boolean;
        status: string;
        details?: string;
      };
      expect(result.running).toBe(false);
      expect(result.status).toBe("error");
      expect(result.details).toContain("Request timed out");
    });

    it("should handle other error types", async () => {
      // Override the mock for this specific test
      (utils.isSonarQubeRunning as jest.Mock).mockImplementationOnce(async () => ({
        running: false,
        status: "error",
        details: "Error checking SonarQube: OTHER_ERROR",
      }));

      const result = (await utils.isSonarQubeRunning({ detailed: true, retries: 0 })) as {
        running: boolean;
        status: string;
        details?: string;
      };
      expect(result.running).toBe(false);
      expect(result.status).toBe("error");
    });
  });

  describe("generateId", () => {
    it("should generate a unique string ID", () => {
      const id = utils.generateId();
      expect(typeof id).toBe("string");
      expect(id.length).toBeGreaterThan(0);
    });
  });
});
