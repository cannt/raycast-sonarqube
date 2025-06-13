/**
 * Minimal test file for terminal.getUserFriendlyErrorMessage
 * Following the iterative methodology for fixing tests
 */

// Import the function to test
import { getUserFriendlyErrorMessage } from "../terminal";

// Silence console output for cleaner test runs
console.log = jest.fn();
console.error = jest.fn();

describe("Terminal Utils - getUserFriendlyErrorMessage", () => {
  test("provides user-friendly message for command not found errors", () => {
    const errorMsg = "bash: command not found";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("Command not found");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("provides user-friendly message for permission denied errors", () => {
    const errorMsg = "permission denied";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("Permission denied");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("provides user-friendly message for no such file errors", () => {
    const errorMsg = "no such file or directory";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("File or directory not found");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("provides user-friendly message for connection refused errors", () => {
    const errorMsg = "connection refused";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("Connection refused");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("provides user-friendly message for timeout errors", () => {
    const errorMsg = "operation timed out";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("Operation timed out");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("provides user-friendly message for SonarQube errors", () => {
    const errorMsg = "Error connecting to sonarqube server";
    const result = getUserFriendlyErrorMessage(errorMsg);

    expect(result).toContain("SonarQube error detected");
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test("handles standard error messages", () => {
    const errorMsg = "some random error";
    const result = getUserFriendlyErrorMessage(errorMsg);

    // Default case for unrecognized patterns - returns the error as-is
    expect(result).toBe(errorMsg);
  });

  test("handles empty error messages", () => {
    const result = getUserFriendlyErrorMessage("");
    expect(result).toBe("");
  });

  test("truncates very long error messages", () => {
    const longError = "x".repeat(200);
    const result = getUserFriendlyErrorMessage(longError);

    expect(result.length).toBe(153); // 150 chars + '...'
    expect(result.endsWith("...")).toBe(true);
  });
});
