/**
 * Effective test implementation for terminal utilities
 */

// Mock execAsync before importing terminal.ts
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create a toast tracking object
class ToastMock {
  style: string = 'animated';
  title: string = '';
  message: string = '';
  
  createToast() {
    // Return a toast object with property setters that update our tracking object
    return {
      get style() { return toastMock.style; },
      get title() { return toastMock.title; },
      get message() { return toastMock.message; },
      set style(value: string) { toastMock.style = value; },
      set title(value: string) { toastMock.title = value; },
      set message(value: string) { toastMock.message = value; }
    };
  }
  
  reset() {
    this.style = 'animated';
    this.title = '';
    this.message = '';
  }
}

const toastMock = new ToastMock();
const mockShowToast = jest.fn().mockImplementation((props) => {
  // Set initial values from props
  toastMock.style = props.style;
  toastMock.title = props.title || '';
  toastMock.message = props.message || '';
  return toastMock.createToast();
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

// Import the modules under test after mocks are set up
import { runCommand, getUserFriendlyErrorMessage } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console logs for cleaner output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = jest.fn();
console.error = jest.fn();

describe('Terminal Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset toast state
    toastMock.reset();
  });
  
  afterAll(() => {
    // Restore console functions
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('provides user-friendly message for command not found errors', () => {
      const errorMsg = 'command not found';
      const result = getUserFriendlyErrorMessage(errorMsg);
      expect(result).toContain(errorMsg);
    });
    
    test('provides user-friendly message for permission denied errors', () => {
      const errorMsg = 'permission denied';
      const result = getUserFriendlyErrorMessage(errorMsg);
      expect(result).toContain(errorMsg);
    });
    
    test('provides user-friendly message for SonarQube errors', () => {
      const errorMsg = 'sonarqube connection failed';
      const result = getUserFriendlyErrorMessage(errorMsg);
      expect(result).toContain(errorMsg);
    });
    
    test('handles empty error messages', () => {
      const result = getUserFriendlyErrorMessage('');
      expect(typeof result).toBe('string');
    });
  });
  
  describe('runCommand', () => {
    beforeEach(() => {
      // Reset mocks and toast state before each test
      jest.clearAllMocks();
      mockExecAsync.mockReset();
      toastMock.reset();
    });
    
    test('displays animated toast initially and success toast on success', async () => {
      // Setup mock for success
      mockExecAsync.mockResolvedValue({
        stdout: 'Command executed successfully',
        stderr: ''
      });
      
      // Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify showToast was called initially
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining('Running:')
      }));
      
      // Verify toast was updated to show success
      expect(toastMock.style).toBe(Toast.Style.Success);
      expect(toastMock.title).toBe('Success Message');
      expect(toastMock.message).toContain('Command executed successfully');
    });
    
    test('displays failure toast when stderr contains errors', async () => {
      // Setup mock for error
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: 'Error: Command execution failed'
      });
      
      // Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify final toast state shows failure
      expect(toastMock.style).toBe(Toast.Style.Failure);
      expect(toastMock.title).toBe('Failure Message');
      expect(toastMock.message).toContain('Command execution failed');
    });
    
    test('displays success toast when stderr only contains warnings', async () => {
      // Setup mock with warning in stderr
      mockExecAsync.mockResolvedValue({
        stdout: 'Command output with warning',
        stderr: 'warning: This is just a warning'
      });
      
      // Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify final toast state shows success despite warning
      expect(toastMock.style).toBe(Toast.Style.Success);
      expect(toastMock.title).toBe('Success Message');
    });
    
    test('displays failure toast when command throws an exception', async () => {
      // Setup mock to throw an error
      mockExecAsync.mockRejectedValue(new Error('Command execution failed'));
      
      // Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify final toast state shows failure
      expect(toastMock.style).toBe(Toast.Style.Failure);
      expect(toastMock.title).toBe('Failure Message');
      expect(toastMock.message).toContain('Command execution failed');
    });
    
    test('passes custom environment options correctly', async () => {
      // Setup mock for success
      mockExecAsync.mockResolvedValue({
        stdout: 'Success with options',
        stderr: ''
      });
      
      // Call with custom options
      const options = { 
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Verify execAsync was called with correct options
      expect(mockExecAsync).toHaveBeenCalledWith(
        'test-command',
        expect.objectContaining({
          cwd: '/custom/path',
          env: expect.objectContaining({
            CUSTOM_VAR: 'value',
            PATH: expect.stringContaining('/opt/homebrew/bin')
          })
        })
      );
    });
  });
});
