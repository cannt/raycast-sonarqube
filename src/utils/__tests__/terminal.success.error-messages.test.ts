/**
 * Successful test for getUserFriendlyErrorMessage
 * Using the iterative test fixing methodology
 */

// Import the function directly - no need for mocks
import { getUserFriendlyErrorMessage } from "../terminal";

describe("Terminal Utils - getUserFriendlyErrorMessage", () => {
  test("recognizes command not found errors", () => {
    const errorMsg = "command not found";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // Check for expected patterns in the result
    expect(result).toContain("Command not found. Make sure all required tools are installed.");
    expect(result).toContain(errorMsg);
  });

  test("recognizes permission denied errors", () => {
    const errorMsg = "permission denied";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // Check for expected patterns in the result - match actual implementation
    expect(result).toContain("Permission denied. You may need to run with higher privileges.");
    expect(result).toContain(errorMsg);
  });

  test("recognizes no such file errors", () => {
    const errorMsg = "no such file or directory";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // Check for expected patterns in the result - match actual implementation
    expect(result).toContain("File or directory not found. Check that paths are correct.");
    expect(result).toContain(errorMsg);
  });

  test("recognizes sonarqube specific errors", () => {
    const errorMsg = "sonarqube connection failed";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // Check for expected patterns in the result
    expect(result).toContain("SonarQube error detected. Verify SonarQube server status and configuration.");
    expect(result).toContain(errorMsg);
  });

  test("provides generic message for unknown errors", () => {
    const errorMsg = "some random error message";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // For unknown errors, should just contain the original message
    expect(result).toContain(errorMsg);
  });

  test("handles empty error messages", () => {
    const result = getUserFriendlyErrorMessage("");

    // Should return a string even for empty input
    expect(typeof result).toBe("string");
  });

  test("truncates long error messages appropriately", () => {
    // Create a very long error message
    const longError = "x".repeat(300);
    const result = getUserFriendlyErrorMessage(longError);

    // Result should contain truncated portion + message
    // The full length will be message + shorter text + ...
    expect(result).toContain("...");
    expect(result.length).toBeLessThan(longError.length + 100); // Allow for added message text
  });
});
