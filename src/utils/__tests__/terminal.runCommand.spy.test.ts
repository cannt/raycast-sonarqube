/**
 * Using a spy-based approach to test runCommand function
 */

// First mock the modules
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsyncFn)
}));

// Create mock functions
const mockExecAsyncFn = jest.fn();
const mockToastSetters = {
  style: jest.fn(),
  title: jest.fn(),
  message: jest.fn()
};

// Import code under test and mocked modules
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output for tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('runCommand using spy approach', () => {
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
    
    // Configure showToast to return a toast object with jest.fn() setters
    (showToast as jest.Mock).mockReturnValue({
      get style() { return 'current-style'; },
      get title() { return 'current-title'; },
      get message() { return 'current-message'; },
      set style(value) { mockToastSetters.style(value); },
      set title(value) { mockToastSetters.title(value); },
      set message(value) { mockToastSetters.message(value); }
    });
  });
  
  test('initializes toast with Animated style', async () => {
    // Setup for successful command execution
    mockExecAsyncFn.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify initial toast was shown with Animated style
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: Toast.Style.Animated,
      title: expect.stringContaining('Running:')
    }));
  });
  
  test('updates toast for successful command execution', async () => {
    // Setup for successful command
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast style was set to Success
    expect(mockToastSetters.style).toHaveBeenCalledWith(Toast.Style.Success);
    expect(mockToastSetters.title).toHaveBeenCalledWith('Success Message');
    expect(mockToastSetters.message).toHaveBeenCalledWith(expect.stringContaining('Command output'));
  });
  
  test('updates toast for command with stderr', async () => {
    // Setup for command with error output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Error output'
    });
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast style was set to Failure
    expect(mockToastSetters.style).toHaveBeenCalledWith(Toast.Style.Failure);
    expect(mockToastSetters.title).toHaveBeenCalledWith('Failure Message');
    expect(mockToastSetters.message).toHaveBeenCalledWith(expect.stringContaining('Error output'));
  });
  
  test('updates toast to Success when stderr only contains warnings', async () => {
    // Setup for command with warnings
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: This is just a warning'
    });
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast style was set to Success despite warnings
    expect(mockToastSetters.style).toHaveBeenCalledWith(Toast.Style.Success);
    expect(mockToastSetters.title).toHaveBeenCalledWith('Success Message');
  });
  
  test('updates toast for command that throws exception', async () => {
    // Setup for command that throws error
    mockExecAsyncFn.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Execute the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast style was set to Failure
    expect(mockToastSetters.style).toHaveBeenCalledWith(Toast.Style.Failure);
    expect(mockToastSetters.title).toHaveBeenCalledWith('Failure Message');
    expect(mockToastSetters.message).toHaveBeenCalledWith(expect.stringContaining('Command execution failed'));
  });
  
  test('passes environment options correctly', async () => {
    // Setup for successful execution with options
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Success with options',
      stderr: ''
    });
    
    // Options to pass
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'value' }
    };
    
    // Execute with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct parameters
    expect(mockExecAsyncFn).toHaveBeenCalled();
    const callArgs = mockExecAsyncFn.mock.calls[0];
    
    // Command
    expect(callArgs[0]).toBe('test-command');
    
    // Options
    expect(callArgs[1].cwd).toBe('/custom/path');
    expect(callArgs[1].env.CUSTOM_VAR).toBe('value');
    
    // PATH should be augmented
    expect(callArgs[1].env.PATH).toBeTruthy();
  });
});
