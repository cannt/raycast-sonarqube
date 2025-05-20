/**
 * Effective test for runCommand terminal utility function
 * Using a simpler, more direct mocking approach
 */

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(() => {
    // Return a mock toast object with setters
    return mockToastObj;
  }),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync
const mockExecAsyncFn = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsyncFn)
}));

// Import modules after mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Create a reusable mock toast object that can be updated via tests
const mockToastObj = {
  style: 'animated',
  title: 'Initial Toast',
  message: 'Initial message'
};

// Suppress console output for tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('runCommand function', () => {
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset toast state before each test
    mockToastObj.style = 'animated';
    mockToastObj.title = 'Initial Toast';
    mockToastObj.message = 'Initial message';
  });
  
  test('shows animated toast initially', async () => {
    // Setup mock to return empty output
    mockExecAsyncFn.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Call the function
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called with correct initial parameters
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: Toast.Style.Animated,
      title: expect.stringContaining('Running:')
    }));
  });
  
  test('updates toast to success when command succeeds', async () => {
    // Setup mock to return successful output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command successful output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify toast was updated correctly to success state
    expect(mockToastObj.style).toBe(Toast.Style.Success);
    expect(mockToastObj.title).toBe('Command Succeeded');
    expect(mockToastObj.message).toContain('Command successful output');
  });
  
  test('updates toast to failure when command has stderr', async () => {
    // Setup mock to return error output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command error output'
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify toast was updated correctly to failure state
    expect(mockToastObj.style).toBe(Toast.Style.Failure);
    expect(mockToastObj.title).toBe('Command Failed');
    expect(mockToastObj.message).toContain('Command error output');
  });
  
  test('treats warnings in stderr as success', async () => {
    // Setup mock to return warning output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: This is just a warning'
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Even with stderr containing a warning, should show success
    expect(mockToastObj.style).toBe(Toast.Style.Success);
    expect(mockToastObj.title).toBe('Command Succeeded');
  });
  
  test('updates toast to failure when command throws exception', async () => {
    // Setup mock to throw an error
    mockExecAsyncFn.mockRejectedValueOnce(new Error('Execution error'));
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify toast was updated correctly to failure state
    expect(mockToastObj.style).toBe(Toast.Style.Failure);
    expect(mockToastObj.title).toBe('Command Failed');
    expect(mockToastObj.message).toContain('Execution error');
  });
  
  test('passes environment options correctly', async () => {
    // Setup mock for successful execution
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Success with options',
      stderr: ''
    });
    
    // Custom options to pass
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'test_value' }
    };
    
    // Call with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct command and options
    expect(mockExecAsyncFn).toHaveBeenCalled();
    const callArgs = mockExecAsyncFn.mock.calls[0];
    
    // First arg should be the command
    expect(callArgs[0]).toBe('test-command');
    
    // Second arg should contain our options
    expect(callArgs[1].cwd).toBe('/custom/path');
    expect(callArgs[1].env.CUSTOM_VAR).toBe('test_value');
    
    // PATH should be modified
    expect(callArgs[1].env.PATH).toBeTruthy();
  });
});
