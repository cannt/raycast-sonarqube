/**
 * Working fix for terminal utility tests
 * Following the iterative test fixing methodology from memory
 */

// First, set up mock for execAsync which is used by terminal.ts
const mockExecOutput = { stdout: '', stderr: '' };
const mockExecAsyncFn = jest.fn().mockImplementation(() => Promise.resolve(mockExecOutput));
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsyncFn)
}));

// Create a trackable toast object to verify prop changes
const toast = {
  style: 'animated',
  title: '',
  message: '',
  
  // Additional methods for tracking toast state changes in test
  setStyle(value: string) { 
    this.style = value; 
    return this;
  },
  setTitle(value: string) { 
    this.title = value; 
    return this;
  },
  setMessage(value: string) { 
    this.message = value; 
    return this;
  },
  
  // Reset the toast state
  reset() {
    this.style = 'animated';
    this.title = '';
    this.message = '';
  }
};

// Create a mock implementation of showToast
const mockShowToast = jest.fn(() => {
  // Create a toast-like object that returns our tracked toast
  return {
    get style() { return toast.style; },
    set style(v) { toast.setStyle(v); },
    get title() { return toast.title; },
    set title(v) { toast.setTitle(v); },
    get message() { return toast.message; },
    set message(v) { toast.setMessage(v); }
  };
});

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: mockShowToast,
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Suppress console output
const originalConsole = { log: console.log, error: console.error };
console.log = jest.fn();
console.error = jest.fn();

// Import after all mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('Terminal Utilities - Working Fix', () => {
  // Reset mocks and state before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsyncFn.mockClear();
    toast.reset();
    
    // Reset our mock execution output
    mockExecOutput.stdout = '';
    mockExecOutput.stderr = '';
  });
  
  // Restore console after all tests
  afterAll(() => {
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });
  
  // BASIC TEST - Build confidence with a simple sanity check
  test('basic test - showToast is called and execAsync executes the command', async () => {
    // Set up success response
    mockExecOutput.stdout = 'Success output';
    
    // Execute the command
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(mockShowToast).toHaveBeenCalled();
    
    // Verify execAsync was called with the right command
    expect(mockExecAsyncFn).toHaveBeenCalledWith(
      'test-command',
      expect.anything()
    );
  });
  
  // SUCCESS CASE - Command executes successfully
  test('success case - shows success toast when command succeeds', async () => {
    // Set up success response
    mockExecOutput.stdout = 'Command executed successfully';
    mockExecOutput.stderr = '';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Check final toast state
    expect(toast.style).toBe('success');
    expect(toast.title).toBe('Success Message');
    expect(toast.message).toContain('Command executed successfully');
  });
  
  // ERROR CASE - Command outputs to stderr
  test('error case - shows failure toast when stderr contains errors', async () => {
    // Set up error response
    mockExecOutput.stdout = '';
    mockExecOutput.stderr = 'Command failed with error';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Check final toast state
    expect(toast.style).toBe('failure');
    expect(toast.title).toBe('Failure Message');
    expect(toast.message).toContain('failed');
  });
  
  // WARNING CASE - Command has warnings in stderr but still succeeds
  test('warning case - treats stderr warnings as success', async () => {
    // Set up warning response
    mockExecOutput.stdout = 'Command output with warning';
    mockExecOutput.stderr = 'warning: This is just a warning';
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Check final toast state
    expect(toast.style).toBe('success');
    expect(toast.title).toBe('Success Message');
  });
  
  // EXCEPTION CASE - Command throws an error
  test('exception case - handles command execution errors', async () => {
    // Set up mock to throw an error
    const errorMessage = 'Command execution failed';
    mockExecAsyncFn.mockRejectedValueOnce(new Error(errorMessage));
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Check final toast state
    expect(toast.style).toBe('failure');
    expect(toast.title).toBe('Failure Message');
    expect(toast.message).toContain(errorMessage);
  });
  
  // OPTIONS CASE - Command passes environment options correctly
  test('options case - passes environment options correctly', async () => {
    // Clear previous calls
    mockExecAsyncFn.mockClear();
    
    // Set up custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Execute the command with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with the correct options
    expect(mockExecAsyncFn).toHaveBeenCalledWith(
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
