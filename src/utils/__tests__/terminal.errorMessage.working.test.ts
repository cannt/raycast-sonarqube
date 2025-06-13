/**
 * Isolated test for getUserFriendlyErrorMessage function
 * Focuses on testing the function without any module mocking
 */

// Import the function directly - no mocks
import { getUserFriendlyErrorMessage } from "../terminal";

describe("getUserFriendlyErrorMessage", () => {
  test("returns user-friendly message for command not found errors", () => {
    const error = "bash: somecommand: command not found";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("Command not found");
    expect(result).toContain("Make sure all required tools are installed");
    expect(result).toContain(error);
  });

  test("returns user-friendly message for permission denied errors", () => {
    const error = "permission denied: /some/file";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("Permission denied");
    expect(result).toContain("higher privileges");
    expect(result).toContain(error);
  });

  test("returns user-friendly message for file not found errors", () => {
    const error = "no such file or directory: /path/to/file";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("File or directory not found");
    expect(result).toContain("Check that paths are correct");
    expect(result).toContain(error);
  });

  test("returns user-friendly message for connection refused errors", () => {
    const error = "connection refused to host 127.0.0.1";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("Connection refused");
    expect(result).toContain("Make sure the service is running");
    expect(result).toContain(error);
  });

  test("returns user-friendly message for timeout errors", () => {
    const error = "operation timed out after 30 seconds";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("Operation timed out");
    expect(result).toContain("unresponsive");
    expect(result).toContain(error);
  });

  test("returns user-friendly message for SonarQube errors", () => {
    const error = "sonarqube server returned an error: 401 Unauthorized";
    const result = getUserFriendlyErrorMessage(error);

    expect(result).toContain("SonarQube error detected");
    expect(result).toContain("Verify SonarQube server status and configuration");
    expect(result).toContain(error);
  });

  test("returns truncated message for unknown errors", () => {
    const error = "Unknown error that does not match any pattern";
    const result = getUserFriendlyErrorMessage(error);

    // For unknown errors, just returns the original string
    expect(result).toBe(error);
  });

  test("truncates very long error messages", () => {
    // Create a very long error message
    const longError = "x".repeat(300);
    const result = getUserFriendlyErrorMessage(longError);

    // Should be truncated to 150 characters + ellipsis
    expect(result.length).toBe(153);
    expect(result).toContain("...");
  });
});
