/**
 * Very simple test for terminal.ts utilities
 * Following the iterative methodology - focusing on making ONE test work
 */

// Important: Jest by default automatically mocks imported modules in tests
// We'll explicitly mock just what we need and control it directly

// First create our mock implementations
const mockToastObject = {
  style: 'animated',
  title: '',
  message: '',
};

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockReturnValue(mockToastObject),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Directly spy on execAsync implementation
const mockExecResult = { stdout: 'Success', stderr: '' };
const mockExecAsyncFn = jest.fn().mockResolvedValue(mockExecResult);

// Mock the util module
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsyncFn)
}));

// Import the module AFTER all mocks are defined
import { showToast, Toast } from '@raycast/api';
import { runCommand } from '../terminal';

// Silence console output
console.log = jest.fn();
console.error = jest.fn();

// Focus on a single test case
describe('Terminal Utilities - Single Focus', () => {
  test('runCommand shows success toast when command succeeds', async () => {
    // ARRANGE: Setup test case
    mockExecResult.stdout = 'Command executed successfully';
    mockExecResult.stderr = '';
    
    // ACT: Execute the function we're testing
    await runCommand('test-command', 'Success', 'Failure');
    
    // ASSERT: Verify the behavior
    // 1. Check if showToast was called (basic sanity check)
    expect(showToast).toHaveBeenCalled();
    
    // 2. Check if the toast was updated correctly
    expect(mockToastObject.style).toBe('success');
    expect(mockToastObject.title).toBe('Success');
  });
});
