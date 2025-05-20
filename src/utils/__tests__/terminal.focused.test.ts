/**
 * Focused test for terminal.ts utilities
 * Following the iterative methodology for test fixing
 */

// IMPORTANT: Create mock implementations BEFORE importing the module under test
const mockToastObject = {
  style: 'animated',
  title: 'Initial title',
  message: 'Initial message'
};

// Set up mocks for @raycast/api
jest.mock('@raycast/api', () => {
  return {
    showToast: jest.fn().mockReturnValue(mockToastObject),
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  };
});

// Mock execAsync
const mockExecResult = { stdout: '', stderr: '' };
const mockExecAsyncFn = jest.fn().mockResolvedValue(mockExecResult);
jest.mock('util', () => ({
  promisify: jest.fn().mockReturnValue(mockExecAsyncFn)
}));

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import AFTER all mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('Terminal Utilities - Focused Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Reset toast object state
    mockToastObject.style = 'animated';
    mockToastObject.title = 'Initial title';
    mockToastObject.message = 'Initial message';
    
    // Reset mock exec result
    mockExecResult.stdout = '';
    mockExecResult.stderr = '';
  });
  
  test('basic test - verify showToast is called', async () => {
    // Set up mock result for this test
    mockExecResult.stdout = 'Success output';
    
    // Execute the function
    await runCommand('test', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(showToast).toHaveBeenCalled();
  });
  
  test('success case - command executes successfully', async () => {
    // Set up mock result
    mockExecResult.stdout = 'Command succeeded';
    mockExecResult.stderr = '';
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast state after execution
    expect(mockToastObject.style).toBe('success');
    expect(mockToastObject.title).toBe('Success Message');
    expect(mockToastObject.message).toContain('Command succeeded');
  });
  
  test('error case - command returns stderr', async () => {
    // Set up mock result with error
    mockExecResult.stdout = '';
    mockExecResult.stderr = 'Error: command failed';
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    expect(mockToastObject.style).toBe('failure');
    expect(mockToastObject.title).toBe('Failure Message');
    expect(mockToastObject.message).toContain('failed');
  });
  
  test('warning case - command has warnings in stderr', async () => {
    // Set up mock result with warnings
    mockExecResult.stdout = 'Command output';
    mockExecResult.stderr = 'warning: this is just a warning';
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast still shows success
    expect(mockToastObject.style).toBe('success');
    expect(mockToastObject.title).toBe('Success Message');
  });
  
  test('exception case - command throws error', async () => {
    // Set up mock to throw an error
    mockExecAsyncFn.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    expect(mockToastObject.style).toBe('failure');
    expect(mockToastObject.title).toBe('Failure Message');
    expect(mockToastObject.message).toContain('Command execution failed');
  });
  
  test('options case - verify environment options', async () => {
    // Clear mock to get clean call data
    mockExecAsyncFn.mockClear();
    
    // Create custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Run command with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct parameters
    expect(mockExecAsyncFn).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'custom-value',
          PATH: expect.any(String)
        })
      })
    );
  });
});
