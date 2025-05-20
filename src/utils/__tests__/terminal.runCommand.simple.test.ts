/**
 * Simplified test for the runCommand terminal utility function
 */
// Mock the @raycast/api module first
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

// Mock execAsync via util.promisify
const mockExecAsyncFn = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsyncFn)
}));

// Now import the module that depends on the mocks
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Store toast state for assertions
const mockToastObj: { style: string | null; title: string | null; message: string | null } = {
  style: null,
  title: null,
  message: null
};

// Set up the showToast implementation after imports
beforeAll(() => {
  // Create a mock implementation for showToast
  (showToast as jest.Mock).mockImplementation((props) => {
    // Set initial state from props
    mockToastObj.style = props.style;
    mockToastObj.title = props.title;
    mockToastObj.message = props.message;
    
    // Return object with property setters
    return {
      set style(value: string) { mockToastObj.style = value; },
      set title(value: string) { mockToastObj.title = value; },
      set message(value: string) { mockToastObj.message = value; }
    };
  });
});

// Suppress console output to keep test output clean
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
    mockToastObj.style = null;
    mockToastObj.title = null;
    mockToastObj.message = null;
  });
  
  // Test initial toast is shown with Animated style
  test('showToast is called initially with Animated style', async () => {
    // Set up mock to do nothing
    mockExecAsyncFn.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Call the function
    await runCommand('echo hello', 'Success', 'Failure');
    
    // Verify showToast is called with Animated style and Running title
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining('Running:')
      })
    );
  });

  // Test success case
  test('updates toast to Success when command succeeds', async () => {
    // Set up mock for successful command output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command succeeded',
      stderr: ''
    });
    
    // Call the function
    await runCommand('echo hello', 'Command Successful', 'Command Failed');
    
    // Verify toast was updated correctly
    expect(mockToastObj.style).toBe(Toast.Style.Success);
    expect(mockToastObj.title).toBe('Command Successful');
    expect(mockToastObj.message).toContain('Command succeeded');
  });

  // Test error case
  test('updates toast to Failure when command has stderr', async () => {
    // Set up mock for command with error output
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Error: command failed'
    });
    
    // Call the function
    await runCommand('echo hello', 'Command Successful', 'Command Failed');
    
    // Verify toast was updated to failure
    expect(mockToastObj.style).toBe(Toast.Style.Failure);
    expect(mockToastObj.title).toBe('Command Failed');
    expect(mockToastObj.message).toContain('failed');
  });

  // Test warning case (should still be success)
  test('shows success toast when stderr only contains warnings', async () => {
    // Set up mock for command with warnings (but no errors)
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: This is just a warning'
    });
    
    // Call the function
    await runCommand('echo hello', 'Command Successful', 'Command Failed');
    
    // Despite stderr containing warning, should show success
    expect(mockToastObj.style).toBe(Toast.Style.Success);
    expect(mockToastObj.title).toBe('Command Successful');
  });

  // Test exception handling
  test('handles exceptions and shows Failure toast', async () => {
    // Set up mock to throw an exception
    mockExecAsyncFn.mockRejectedValueOnce(new Error('Command execution error'));
    
    // Call the function
    await runCommand('bad-command', 'Command Successful', 'Command Failed');
    
    // Verify toast shows failure
    expect(mockToastObj.style).toBe(Toast.Style.Failure);
    expect(mockToastObj.title).toBe('Command Failed');
    expect(mockToastObj.message).toContain('Command execution error');
  });

  // Test with environment options
  test('passes custom environment options correctly', async () => {
    // Set up mock for success
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Success with options',
      stderr: ''
    });
    
    // Define custom options
    const options = {
      cwd: '/custom/directory',
      env: { CUSTOM_VAR: 'custom_value' }
    };
    
    // Call function with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct options
    expect(mockExecAsyncFn).toHaveBeenCalled();
    const callArgs = mockExecAsyncFn.mock.calls[0];
    
    expect(callArgs[0]).toBe('test-command');
    expect(callArgs[1].cwd).toBe('/custom/directory');
    expect(callArgs[1].env.CUSTOM_VAR).toBe('custom_value');
    
    // PATH should be augmented (we don't know the exact value but it should exist)
    expect(callArgs[1].env.PATH).toBeTruthy();
  });
});
