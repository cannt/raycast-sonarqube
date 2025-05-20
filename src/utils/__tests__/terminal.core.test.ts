/**
 * Core tests for terminal utility functions
 * This focuses on the essential functionality with straightforward mocks
 */

// Mock API
const mockToast = {
  style: 'animated',
  title: 'Initial title',
  message: 'Initial message',
  hide: jest.fn()
};

jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockResolvedValue(mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks
import { getUserFriendlyErrorMessage, runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('Terminal utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.style = 'animated';
    mockToast.title = 'Initial title';
    mockToast.message = 'Initial message';
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('formats command not found error', () => {
      const error = 'bash: sonar-scanner: command not found';
      const result = getUserFriendlyErrorMessage(error);
      
      expect(result).toContain('Command not found');
      expect(result).toContain('Details:');
      expect(result).toContain('bash: sonar-scanner: command not found');
    });
  });
  
  describe('runCommand - basic', () => {
    test('shows initial toast with command name', async () => {
      // Setup success case
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Success output',
        stderr: ''
      });
      
      // Run command
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Verify initial toast was shown with command name
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining('test-command')
        })
      );
    });
  });
});
