/**
 * Simplified working test for terminal utilities
 */

// Mock setup
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create a toast object that will capture updates
const mockToast = {
  style: undefined,
  title: undefined,
  message: undefined
};

// Mock showToast to return our mock toast
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockImplementation(initialProps => {
    // Set initial properties
    mockToast.style = initialProps.style;
    mockToast.title = initialProps.title;
    mockToast.message = initialProps.message;
    return mockToast;
  }),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import after mocks are set up
import { runCommand, getUserFriendlyErrorMessage } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('Terminal Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    mockToast.style = undefined;
    mockToast.title = undefined;
    mockToast.message = undefined;
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('handles command not found errors', () => {
      const result = getUserFriendlyErrorMessage('command not found');
      // Expect the result to contain the input error message
      expect(result).toContain('command not found');
    });
    
    test('handles permission denied errors', () => {
      const result = getUserFriendlyErrorMessage('permission denied');
      // Expect the result to contain the input error message
      expect(result).toContain('permission denied');
    });
  });
  
  describe('runCommand', () => {
    test('shows success toast when command succeeds', async () => {
      // Arrange: Setup mock for success
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command succeeded',
        stderr: ''
      });
      
      // Act: Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert: Verify initial toast was shown
      expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining('Running:')
      }));
      
      // Assert: Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
      expect(mockToast.message).toContain('Command succeeded');
    });
    
    test('shows failure toast when stderr contains errors', async () => {
      // Arrange: Setup mock with error output
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed with an error'
      });
      
      // Act: Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert: Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      expect(mockToast.message).toContain('failed');
    });
    
    test('shows success toast when stderr only contains warnings', async () => {
      // Arrange: Setup mock with warning in stderr
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning'
      });
      
      // Act: Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert: Verify final toast state (should be success despite warning)
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
    });
    
    test('shows failure toast when command throws an error', async () => {
      // Arrange: Setup mock to throw an error
      mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Act: Run the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert: Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      expect(mockToast.message).toContain('Command execution failed');
    });
    
    test('passes environment options correctly', async () => {
      // Arrange: Setup mock for success
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command succeeded with options',
        stderr: ''
      });
      
      const options = {
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      // Act: Run command with options
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Assert: Verify execAsync was called with correct parameters
      expect(mockExecAsync).toHaveBeenCalledWith(
        'test-command',
        expect.objectContaining({
          cwd: '/custom/path',
          env: expect.objectContaining({
            CUSTOM_VAR: 'value',
            PATH: expect.stringContaining('/opt')
          })
        })
      );
    });
  });
});
