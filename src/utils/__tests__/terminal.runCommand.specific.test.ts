/**
 * Specific test for the runCommand function
 * Following the iterative test fixing methodology from memory
 */

// Create a mock for execAsync
const mockExecOutput = { stdout: 'Success output', stderr: '' };
const mockExecAsync = jest.fn().mockResolvedValue(mockExecOutput);

// Mock the util module to return our controlled mockExecAsync
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create a mock toast object that we can examine in tests
const mockToast = {
  style: 'animated',
  title: 'Initial Title',
  message: 'Initial Message'
};

// Create a mock for showToast that returns our controlled mockToast
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(() => mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success', 
      Failure: 'failure'
    }
  }
}));

// Suppress console logs
const originalConsole = { log: console.log, error: console.error };
console.log = jest.fn();
console.error = jest.fn();

// Import the module under test AFTER all mocks are established
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand Function Tests', () => {
  // Setup and teardown
  beforeEach(() => {
    // Reset all mocks and state
    jest.clearAllMocks();
    mockExecAsync.mockClear();
    
    // Reset mock toast state
    mockToast.style = 'animated';
    mockToast.title = 'Initial Title';
    mockToast.message = 'Initial Message';
    
    // Reset mock exec output
    mockExecOutput.stdout = 'Success output';
    mockExecOutput.stderr = '';
  });
  
  afterAll(() => {
    // Restore console functions
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });
  
  // Basic test to verify showToast is called
  test('basic functionality - showToast is called', async () => {
    // Call the function
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(showToast).toHaveBeenCalled();
  });
  
  // Test successful command execution
  test('shows success toast when command succeeds', async () => {
    // Ensure mockExecAsync returns success
    mockExecOutput.stdout = 'Command executed successfully';
    mockExecOutput.stderr = '';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated correctly
    expect(mockToast.style).toBe('success');
    expect(mockToast.title).toBe('Success Message');
    expect(mockToast.message).toContain('Command executed successfully');
  });
  
  // Test command with stderr output
  test('shows failure toast when stderr contains errors', async () => {
    // Set up mock to return error
    mockExecOutput.stdout = '';
    mockExecOutput.stderr = 'Command failed with error';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('failed');
  });
  
  // Test command with warnings in stderr
  test('treats warnings in stderr as non-failures', async () => {
    // Set up mock with warning in stderr
    mockExecOutput.stdout = 'Command output';
    mockExecOutput.stderr = 'warning: This is just a warning';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast still shows success
    expect(mockToast.style).toBe('success');
    expect(mockToast.title).toBe('Success Message');
  });
  
  // Test command that throws an exception
  test('shows failure toast when command throws exception', async () => {
    // Set up mock to throw an error
    const errorMessage = 'Command execution failed';
    mockExecAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain(errorMessage);
  });
  
  // Test passing environment options
  test('passes environment options correctly', async () => {
    // Reset the mock to get clean call data
    mockExecAsync.mockClear();
    
    // Create custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Execute the command with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct parameters
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command', 
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'custom-value',
          PATH: expect.stringContaining('/opt/homebrew/bin')
        })
      })
    );
  });
});
