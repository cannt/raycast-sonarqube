/**
 * Simplified test for terminal utilities
 * This test only verifies the utility functions directly
 */

// Mock execAsync before importing terminal module
const mockExecAsync = jest.fn();
jest.mock("util", () => ({
  promisify: jest.fn(() => mockExecAsync),
}));

// Mock API methods and Toast module
const mockShowToast = jest.fn();
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

// Suppress console output for cleaner test output
console.log = jest.fn();
console.error = jest.fn();

// Import the functions under test
import { getUserFriendlyErrorMessage } from "../terminal";

describe("Terminal Utilities Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getUserFriendlyErrorMessage", () => {
    test("processes common error patterns", () => {
      // Test command not found message
      const errorMsg1 = "bash: sonar-scanner: command not found";
      const result1 = getUserFriendlyErrorMessage(errorMsg1);
      expect(result1).toContain("Command not found");
      expect(result1).toContain("Details:");

      // Test permission denied message
      const errorMsg2 = "permission denied: /usr/local/bin/sonar-scanner";
      const result2 = getUserFriendlyErrorMessage(errorMsg2);
      expect(result2).toContain("Permission denied");

      // Test SonarQube specific error
      const errorMsg3 = "Failed to connect to SonarQube server at localhost:9000";
      const result3 = getUserFriendlyErrorMessage(errorMsg3);
      expect(result3).toContain("SonarQube error");
    });

    test("handles long error messages", () => {
      const longError = "X".repeat(200);
      const result = getUserFriendlyErrorMessage(longError);

      // Verify it truncates the message
      expect(result.length).toBeLessThan(longError.length + 50); // Allow for added prefix text
      expect(result).toContain("...");
    });

    test("returns the original message when no pattern matches", () => {
      const randomError = "Some random error message";
      const result = getUserFriendlyErrorMessage(randomError);

      // Should return truncated message since no pattern matches
      expect(result).toContain(randomError);
    });
  });
});
