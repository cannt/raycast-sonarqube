/**
 * Terminal utilities test with proper Jest hoisting
 */

// IMPORTANT: Mock modules before importing any other modules
// This ensures Jest's hoisting works correctly
jest.mock('util', () => {
  return {
    promisify: jest.fn(() => mockExecAsync)
  };
});

jest.mock('@raycast/api', () => ({
  showToast: jest.fn(() => mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Define mocks after module mocking but before imports
const mockExecAsync = jest.fn();
const mockToast = {
  style: 'animated',
  title: '',
  message: ''
};

// Now we can import the modules under test
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal Utilities (With Proper Mocking)', () => {
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
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
  });
  
  describe('runCommand', () => {
    test('shows success toast when command succeeds', async () => {
      // Setup mock for successful execution
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command executed successfully',
        stderr: ''
      });
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify initial toast was shown
      expect(showToast).toHaveBeenCalled();
      
      // Verify final toast state is success
      expect(mockToast.style).toBe('success');
      expect(mockToast.title).toBe('Success Message');
    });
    
    test('shows failure toast when command has error output', async () => {
      // Setup mock with error output
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed with error'
      });
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast shows failure
      expect(mockToast.style).toBe('failure');
      expect(mockToast.title).toBe('Failure Message');
    });
    
    test('shows failure toast when command throws exception', async () => {
      // Setup mock to throw an error
      mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Execute the command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify toast shows failure
      expect(mockToast.style).toBe('failure');
      expect(mockToast.title).toBe('Failure Message');
    });
    
    test('passes environment options correctly', async () => {
      // Setup mock for successful execution
      mockExecAsync.mockResolvedValueOnce({
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
