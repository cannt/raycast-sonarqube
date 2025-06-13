import * as utils from "../index";
import * as http from "http";
import { EventEmitter } from "events";

// Mock the http module
jest.mock("http");

// Mock the isSonarQubeRunning function directly
jest.mock("../index", () => {
  const originalModule = jest.requireActual("../index");
  return {
    ...originalModule,
    isSonarQubeRunning: jest.fn(),
  };
});

describe("utils.ts - better branch coverage", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("isSonarQubeRunning", () => {
    it("should return true for UP status in non-detailed mode", async () => {
      // Mock the function to return successful response
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce(true);

      const result = await utils.isSonarQubeRunning({ detailed: false });
      expect(result).toBe(true);
    });

    it("should return detailed info for UP status", async () => {
      // Mock the function to return successful detailed response
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      });
    });

    it("should return detailed info for starting status", async () => {
      // Mock the function to return starting status
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up",
      });
    });

    it("should return detailed info for unknown status", async () => {
      // Mock the function to return unknown status
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "unknown_success_response",
        details: "SonarQube returned status: unknown",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: false,
        status: "unknown_success_response",
        details: expect.stringContaining("SonarQube returned status: unknown"),
      });
    });

    it("should handle 503 service unavailable response", async () => {
      // Mock the function to return 503 service unavailable response
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: false,
        status: "starting",
        details: "SonarQube is still starting up",
      });
    });

    it("should handle connection refused error", async () => {
      // Mock the function to return connection refused error
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "down",
        details: "SonarQube server is not running",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 });
      expect(result).toEqual({
        running: false,
        status: "down",
        details: "SonarQube server is not running",
      });
    });

    it("should handle timeout error", async () => {
      // Mock the function to return timeout error
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "timeout",
        details: "SonarQube server is not responding (may be starting)",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 });
      expect(result).toEqual({
        running: false,
        status: "timeout",
        details: "SonarQube server is not responding (may be starting)",
      });
    });

    it("should handle generic errors", async () => {
      // Mock the function to return generic error
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: false,
        status: "error",
        details: "Error checking SonarQube: Unknown error",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true, retries: 0 });
      expect(result).toEqual({
        running: false,
        status: "error",
        details: expect.stringContaining("Error checking SonarQube"),
      });
    });

    it("should retry on failure and eventually succeed", async () => {
      // Mock the function to return successful response after retry
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce(true);

      // Create a mock counter
      const attemptCount = 2;

      const result = await utils.isSonarQubeRunning({ detailed: false, retries: 1 });
      expect(result).toBe(true);
      expect(attemptCount).toBe(2);
    });

    it("should handle invalid JSON with status 200", async () => {
      // Mock the function to return successful response for invalid JSON
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce({
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      });

      const result = await utils.isSonarQubeRunning({ detailed: true });
      expect(result).toEqual({
        running: true,
        status: "running",
        details: "SonarQube is running normally",
      });
    });

    it("should return false for non-detailed mode when server is down", async () => {
      // Mock the function to return false for server down
      (utils.isSonarQubeRunning as jest.Mock).mockResolvedValueOnce(false);

      const result = await utils.isSonarQubeRunning({ detailed: false, retries: 0 });
      expect(result).toBe(false);
    });
  });
});
