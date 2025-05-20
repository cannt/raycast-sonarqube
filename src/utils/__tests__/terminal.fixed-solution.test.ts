/**
 * Fixed solution for terminal utility tests
 * Based on the working pattern from terminal.basic.working.test.ts
 */

// Mock the Raycast API with the working pattern
jest.mock('@raycast/api', () => {
  // Create tracking object for showToast call verification
  const mockToast: {
    style: string | null,
    title: string | null,
    message: string | null
  } = {
    style: null,
    title: null,
    message: null
  };
  
  // Mock showToast to return a mockable object
  const showToastMock = jest.fn().mockImplementation((props) => {
    // Set initial values
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || '';
    
    // Return an object with property setters that update the mock
    return {
      set style(value: string) { mockToast.style = value; },
      set title(value: string) { mockToast.title = value; },
      set message(value: string) { mockToast.message = value; }
    };
  });
  
  return {
    showToast: showToastMock,
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    },
    // Export for test verification
    _getMockToast: () => mockToast
  };
});

// Mock execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import after mocking
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Get the helper function to access the mock toast
const { _getMockToast } = jest.requireMock('@raycast/api');

describe('Terminal Utilities Fixed Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset toast state
    const mockToast = _getMockToast();
    mockToast.style = null;
    mockToast.title = null;
    mockToast.message = null;
  });
  
  test('displays animated toast initially', async () => {
    // Setup mock for success
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify showToast was called with correct initial parameters
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'animated',
        title: expect.stringContaining('Running:')
      })
    );
  });
  
  test('shows success toast when command succeeds', async () => {
    // Setup mock for success
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command executed successfully',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated to success
    const finalToastState = _getMockToast();
    expect(finalToastState.style).toBe('success');
    expect(finalToastState.title).toBe('Success Message');
    expect(finalToastState.message).toContain('Command executed successfully');
  });
  
  test('shows failure toast when stderr contains errors', async () => {
    // Setup mock with error output
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command failed with error'
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated to failure
    const finalToastState = _getMockToast();
    expect(finalToastState.style).toBe('failure');
    expect(finalToastState.title).toBe('Failure Message');
    expect(finalToastState.message).toContain('failed');
  });
  
  test('treats stderr warnings as non-failures', async () => {
    // Setup mock with warning in stderr
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output with warning',
      stderr: 'warning: This is just a warning'
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast still shows success
    const finalToastState = _getMockToast();
    expect(finalToastState.style).toBe('success');
    expect(finalToastState.title).toBe('Success Message');
  });
  
  test('handles command execution errors', async () => {
    // Setup mock to throw an error
    mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    const finalToastState = _getMockToast();
    expect(finalToastState.style).toBe('failure');
    expect(finalToastState.title).toBe('Failure Message');
    expect(finalToastState.message).toContain('Command execution failed');
  });
  
  test('passes environment options correctly', async () => {
    // Reset mock for clean call data
    mockExecAsync.mockClear();
    
    // Create custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Call the function with options
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
