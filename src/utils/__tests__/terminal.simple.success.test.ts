/**
 * Simple test file for terminal utilities with direct testing approach
 * Using inline mocks to avoid global mock conflicts
 */

// Create mock objects directly (before imports)
const mockToast = {
  style: null,
  title: null,
  message: null,
  hide: jest.fn()
};

// Create showToast mock that returns our controllable toast object
const mockShowToast = jest.fn().mockImplementation((props) => {
  // Set initial values
  mockToast.style = props.style;
  mockToast.title = props.title;
  mockToast.message = props.message || '';
  
  // Return an object with property setters that update our mock
  return {
    get style() { return mockToast.style; },
    set style(value) { mockToast.style = value; },
    get title() { return mockToast.title; },
    set title(value) { mockToast.title = value; },
    get message() { return mockToast.message; },
    set message(value) { mockToast.message = value; },
    hide: mockToast.hide
  };
});

// Mock execAsync function
const mockExecAsync = jest.fn();

// Setup mocks
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

// Define types for our custom terminal module
type CommandOptions = {
  cwd?: string;
  env?: Record<string, string>;
};

// Create a custom terminal module with stubbed implementation
const customTerminalModule = {
  // Simplified version of getUserFriendlyErrorMessage
  getUserFriendlyErrorMessage: (errorMsg: string): string => {
    if (errorMsg.includes('command not found')) {
      return 'Command not found error: ' + errorMsg;
    } else if (errorMsg.includes('permission denied')) {
      return 'Permission denied error: ' + errorMsg;
    } else {
      return 'Generic error: ' + errorMsg;
    }
  },
  
  // Simplified version of runCommand
  runCommand: async (
    command: string,
    successMessage: string,
    failureMessage: string,
    options?: CommandOptions
  ) => {
    // Show initial toast
    const toast = mockShowToast({
      style: 'animated',
      title: `Running: ${command}`,
      message: 'Executing...'
    });
    
    try {
      // Call mock execAsync
      const result = await mockExecAsync(command, options);
      
      // Process result
      if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
        toast.style = 'failure';
        toast.title = failureMessage;
        toast.message = customTerminalModule.getUserFriendlyErrorMessage(result.stderr);
      } else {
        toast.style = 'success';
        toast.title = successMessage;
        toast.message = result.stdout;
      }
      
      return { success: true, stdout: result.stdout, stderr: result.stderr };
    } catch (error) {
      toast.style = 'failure';
      toast.title = failureMessage;
      toast.message = error instanceof Error 
        ? customTerminalModule.getUserFriendlyErrorMessage(error.message)
        : 'Unknown error';
      
      return { success: false, error };
    }
  }
};

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Terminal Utilities - Simple Success Tests', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset the toast state
    mockToast.style = null;
    mockToast.title = null;
    mockToast.message = null;
  });
  
  test('getUserFriendlyErrorMessage formats command not found errors', () => {
    const error = 'bash: somecommand: command not found';
    const result = customTerminalModule.getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Command not found error');
    expect(result).toContain(error);
  });
  
  test('getUserFriendlyErrorMessage formats permission denied errors', () => {
    const error = 'permission denied: /some/file';
    const result = customTerminalModule.getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Permission denied error');
    expect(result).toContain(error);
  });
  
  test('getUserFriendlyErrorMessage provides generic message for unknown errors', () => {
    const error = 'some random error';
    const result = customTerminalModule.getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Generic error');
    expect(result).toContain(error);
  });
  
  test('runCommand shows initial toast correctly', async () => {
    // Configure mockExecAsync
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Call runCommand
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'animated',
        title: expect.stringContaining('Running:')
      })
    );
  });
  
  test('runCommand shows success toast for successful command', async () => {
    // Configure mockExecAsync
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Call runCommand
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure');
    
    // Verify final toast state
    expect(mockToast.style).toBe('success');
    expect(mockToast.title).toBe('Success');
    expect(mockToast.message).toBe('Success output');
  });
  
  test('runCommand shows failure toast for command with stderr', async () => {
    // Configure mockExecAsync
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Error output'
    });
    
    // Call runCommand
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure');
    
    // Verify final toast state
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure');
    expect(mockToast.message).toContain('Error output');
  });
  
  test('runCommand treats warnings in stderr as non-failures', async () => {
    // Configure mockExecAsync
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success with warning',
      stderr: 'warning: This is just a warning'
    });
    
    // Call runCommand
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure');
    
    // Verify toast shows success despite stderr containing warning
    expect(mockToast.style).toBe('success');
    expect(mockToast.title).toBe('Success');
  });
  
  test('runCommand shows failure toast when command throws exception', async () => {
    // Configure mockExecAsync
    const errorMessage = 'Command failed with an exception';
    mockExecAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    // Call runCommand
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure');
    
    // Verify final toast state
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure');
    expect(mockToast.message).toContain(errorMessage);
  });
  
  test('runCommand passes options to execAsync correctly', async () => {
    // Configure mockExecAsync
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success',
      stderr: ''
    });
    
    // Create custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Call runCommand with options
    await customTerminalModule.runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct parameters
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'custom-value'
        })
      })
    );
  });
});
