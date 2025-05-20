/**
 * Terminal utilities test with proper mocking
 */

// Mock execAsync before importing terminal.ts
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create a properly implemented mock toast
const mockToast = {
  style: 'animated',
  title: '',
  message: ''
};

// Mock the showToast function to return our mockToast object
const mockShowToast = jest.fn(() => mockToast);

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

// Suppress console logs/errors
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks are set up
import { runCommand, getUserFriendlyErrorMessage } from '../terminal';
import { Toast } from '@raycast/api';

describe('Terminal Utilities', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset toast object state
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
  });
  
  // Restore console functions after tests
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('recognizes command not found errors', () => {
      const result = getUserFriendlyErrorMessage('command not found');
      expect(result).toContain('Command not found');
    });
    
    test('recognizes permission denied errors', () => {
      const result = getUserFriendlyErrorMessage('permission denied');
      expect(result).toContain('Permission denied');
    });
    
    test('handles unknown errors', () => {
      const result = getUserFriendlyErrorMessage('some unknown error message');
      expect(result).toContain('some unknown error message');
    });
  });
  
  describe('runCommand', () => {
    test('shows initial animated toast and then success toast', async () => {
      // Setup mock for successful execution
      mockExecAsync.mockResolvedValue({
        stdout: 'Command executed successfully',
        stderr: ''
      });
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify showToast was called with correct initial parameters
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining('Running:')
      }));
      
      // Verify toast was updated to success
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
      expect(mockToast.message).toContain('Command executed successfully');
    });
    
    test('shows failure toast when command outputs to stderr', async () => {
      // Setup mock with error output
      mockExecAsync.mockResolvedValue({
        stdout: '',
        stderr: 'Command failed with error'
      });
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast was updated to failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      // The message should contain the error
      expect(mockToast.message).toContain('failed');
    });
    
    test('treats stderr warnings as non-failures', async () => {
      // Setup mock with warning in stderr
      mockExecAsync.mockResolvedValue({
        stdout: 'Command succeeded with warning output',
        stderr: 'Warning: This is just a warning message'
      });
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Should still show success despite warning in stderr
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
    });
    
    test('shows failure toast when command throws exception', async () => {
      // Setup mock to throw an error
      mockExecAsync.mockRejectedValue(new Error('Command execution failed'));
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast shows failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      expect(mockToast.message).toContain('Command execution failed');
    });
    
    test('passes environment options correctly', async () => {
      // Setup mock for successful execution
      mockExecAsync.mockResolvedValue({
        stdout: 'Command succeeded',
        stderr: ''
      });
      
      // Execute with custom options
      const options = {
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'custom-value' }
      };
      
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
});
