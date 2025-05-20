/**
 * Minimal test for terminal.ts to verify our mocking approach
 */

// Create mock for execAsync
const mockExecAsync = jest.fn();

// Mock the execAsync function directly
jest.mock('../terminal', () => {
  // Get the actual module
  const originalModule = jest.requireActual('../terminal');
  
  // Return a modified version with our mocked execAsync
  return {
    ...originalModule,
    execAsync: mockExecAsync,
  };
});

// Mock the Raycast API
let mockToastInstance = {
  style: 'animated',
  title: 'Initial title',
  message: 'Initial message'
};

// Create a mock toast object with setters that update our instance
const createMockToast = () => ({
  set style(value: string) { mockToastInstance.style = value; },
  set title(value: string) { mockToastInstance.title = value; },
  set message(value: string) { mockToastInstance.message = value; }
});

const mockShowToast = jest.fn().mockImplementation((props) => {
  // Set initial properties from props
  mockToastInstance.style = props.style;
  mockToastInstance.title = props.title;
  mockToastInstance.message = props.message || '';
  
  // Return the mock toast object so it can be updated
  return createMockToast();
});

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

// Import after mocking to ensure mocks are in place
import { getUserFriendlyErrorMessage, runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal utilities tests', () => {
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the toast instance
    mockToastInstance = {
      style: 'animated',
      title: 'Initial title',
      message: 'Initial message'
    };
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('returns the error message for unknown patterns', () => {
      const result = getUserFriendlyErrorMessage('some random error');
      // For unknown patterns, it returns the original error truncated if necessary
      expect(result).toBe('some random error');
    });
    
    test('provides friendly message for command not found errors', () => {
      const result = getUserFriendlyErrorMessage('bash: command not found');
      // It should match one of our error patterns and return a user-friendly message
      expect(result).toContain('Command not found');
      expect(result).toContain('Make sure all required tools are installed');
      expect(result).toContain('bash: command not found'); // Original error is included
    });
  });
  
  describe('execAsync', () => {
    test('can be mocked correctly', async () => {
      // Setup mock response for execAsync
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'command output',
        stderr: ''
      });
      
      // Call runCommand with our mocked execAsync
      await runCommand('test command', 'Success', 'Failure');
      
      // Verify mockExecAsync was called - options object is passed as second arg
      expect(mockExecAsync).toHaveBeenCalled();
      const call = mockExecAsync.mock.calls[0];
      expect(call[0]).toBe('test command');
      expect(call[1]).toBeDefined(); // Should have options object
    });
  });
  
  describe('runCommand', () => {
    test('shows animated toast initially', async () => {
      // Setup mock response
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Success output',
        stderr: ''
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify showToast was called initially with animated style
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining('Running:')
        })
      );
    });
    
    test('shows success toast when command succeeds', async () => {
      // Clear previous calls first
      mockExecAsync.mockReset();
      // Setup mock response - this will always resolve
      mockExecAsync.mockResolvedValue({
        stdout: 'Success output',
        stderr: ''
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast was updated to success
      expect(mockToastInstance.style).toBe(Toast.Style.Success);
      expect(mockToastInstance.title).toBe('Success Message');
      expect(mockToastInstance.message).toContain('Success output');
    });
    
    test('shows failure toast when command has stderr', async () => {
      // Clear previous calls
      mockExecAsync.mockReset();
      // Setup mock response with stderr
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: 'Command failed with an error'
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast was updated to failure
      expect(mockToastInstance.style).toBe(Toast.Style.Failure);
      expect(mockToastInstance.title).toBe('Failure Message');
      // The message should contain our error
      expect(mockToastInstance.message).toContain('failed');
    });
    
    test('shows failure toast when command throws exception', async () => {
      // Setup mock to reject the promise
      mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Call runCommand
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast was updated to failure
      expect(mockToastInstance.style).toBe(Toast.Style.Failure);
      expect(mockToastInstance.title).toBe('Failure Message');
      expect(mockToastInstance.message).toBeTruthy();
    });
    
    test('treats warnings in stderr as non-failures', async () => {
      // Clear previous calls
      mockExecAsync.mockReset();
      // Setup mock with warning in stderr
      mockExecAsync.mockResolvedValue({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning message'
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Even with warning in stderr, it should show success
      expect(mockToastInstance.style).toBe(Toast.Style.Success);
      expect(mockToastInstance.title).toBe('Success Message');
    });
    
    test('passes environment options correctly', async () => {
      // Clear previous calls to our mock
      mockExecAsync.mockReset();
      
      // Mock successful command execution with a spy function that captures args
      mockExecAsync.mockImplementation((cmd, opts) => {
        // Just resolve with empty response
        return Promise.resolve({
          stdout: 'Success with options',
          stderr: ''
        });
      });
      
      // Call with custom options
      const options = { 
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Verify execAsync was called
      expect(mockExecAsync).toHaveBeenCalled();
      
      // Get the arguments from the first call
      const firstCall = mockExecAsync.mock.calls[0];
      expect(firstCall[0]).toBe('test-command');
      
      // Options should be passed correctly
      const passedOptions = firstCall[1];
      expect(passedOptions).toBeDefined();
      expect(passedOptions.cwd).toBe('/custom/path');
      expect(passedOptions.env.CUSTOM_VAR).toBe('value');
      
      // PATH should be augmented but we can't predict the exact value
      // Just check that it exists
      expect(passedOptions.env.PATH).toBeTruthy();
    });
  });
});
