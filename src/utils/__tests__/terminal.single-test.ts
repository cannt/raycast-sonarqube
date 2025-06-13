// terminal.single-test.ts
// A minimal test focusing on just the core functionality

/// <reference types="jest" />
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Mock the external modules BEFORE importing the module under test
// These mock implementations need to be simple and direct
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockReturnValue({
    style: null,
    title: null,
    message: null,
  }),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

// Mock execAsync with a simple implementation
const mockExecResult = { stdout: "Success output", stderr: "" };
const mockExecAsync = jest.fn().mockResolvedValue(mockExecResult);
jest.mock("util", () => ({
  promisify: jest.fn().mockReturnValue(mockExecAsync),
}));

// Import the tested module AFTER setting up all mocks
import { runCommand } from "../terminal";
import { showToast, Toast } from "@raycast/api";

// Basic test to verify the function behavior
test("runCommand basic functionality", async () => {
  // Configure mock return value for this test
  mockExecResult.stdout = "Test success output";
  mockExecResult.stderr = "";

  // Execute the function under test
  await runCommand("test-command", "Success Message", "Error Message");

  // Verify showToast was called at least once
  expect(showToast).toHaveBeenCalled();

  // Verify execAsync was called with the correct command
  expect(mockExecAsync).toHaveBeenCalledWith("test-command", expect.anything());
});
