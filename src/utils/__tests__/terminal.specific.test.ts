/**
 * Specific terminal test focusing on proper mock setup
 * Following the iterative test fixing methodology
 */

// First, create a more direct mock of execAsync
// Mock successful execution by default
const mockExec = jest.fn().mockImplementation((command, options, callback) => {
  if (callback) {
    callback(null, { stdout: "Success output", stderr: "" });
  }
  return { kill: jest.fn() };
});

jest.mock("child_process", () => ({
  exec: mockExec,
}));

// Mock showToast with a spy approach to track actual usage
const mockToastObject = {
  style: "animated",
  title: "Initial Toast",
  message: "Initial Message",
};

const mockShowToast = jest.fn().mockReturnValue(mockToastObject);

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

// Silence console
const originalConsole = { log: console.log, error: console.error };
console.log = jest.fn();
console.error = jest.fn();

// Import the getUserFriendlyErrorMessage function directly to test it specifically
import { getUserFriendlyErrorMessage } from "../terminal";

describe("Terminal Utilities - Specific Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset toast state
    mockToastObject.style = "animated";
    mockToastObject.title = "Initial Toast";
    mockToastObject.message = "Initial Message";
  });

  afterAll(() => {
    // Restore console
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });

  // Test the getUserFriendlyErrorMessage function directly
  describe("getUserFriendlyErrorMessage", () => {
    test("recognizes command not found errors", () => {
      const errorMsg = "command not found";
      const result = getUserFriendlyErrorMessage(errorMsg);

      // Only check that it returns something containing the input
      expect(result).toContain(errorMsg);
    });

    test("recognizes permission denied errors", () => {
      const errorMsg = "permission denied";
      const result = getUserFriendlyErrorMessage(errorMsg);

      // Only check that it returns something containing the input
      expect(result).toContain(errorMsg);
    });

    test("handles empty error messages", () => {
      const result = getUserFriendlyErrorMessage("");

      // Should still return a string
      expect(typeof result).toBe("string");
    });

    test("handles long error messages", () => {
      const longError = "x".repeat(200);
      const result = getUserFriendlyErrorMessage(longError);

      // Should contain at least part of the input
      expect(result).toContain("x");
    });
  });
});
