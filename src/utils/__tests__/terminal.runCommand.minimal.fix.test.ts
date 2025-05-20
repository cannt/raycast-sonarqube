/**
 * Minimal test for runCommand with proper mocking
 * Following the iterative test-fixing methodology
 */

// Important: Use jest.doMock instead of jest.mock for better control
jest.doMock('@raycast/api', () => {
  // Create a proper mock toast object that can be observed
  const mockToast = {
    style: 'animated',
    title: 'Initial Title',
    message: 'Initial Message',
    hide: jest.fn()
  };
  
  // Create a properly tracked mock for showToast
  const showToastMock = jest.fn().mockReturnValue(mockToast);
  
  return {
    showToast: showToastMock,
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  };
});

// Mock execAsync with controlled implementation
const execAsyncMock = jest.fn().mockResolvedValue({ stdout: '', stderr: '' });
jest.doMock('util', () => ({
  promisify: jest.fn(() => execAsyncMock)
}));

// Suppress console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = jest.fn();
console.error = jest.fn();

// Import modules after all mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand - minimal test', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  test('basic function execution does not throw error', async () => {
    // Configure the mock to return a successful result
    execAsyncMock.mockResolvedValueOnce({
      stdout: 'Test output',
      stderr: ''
    });
    
    // Just verify it runs without error (minimum test)
    await expect(runCommand(
      'test-command',
      'Success Message',
      'Error Message'
    )).resolves.not.toThrow();
    
    // Simple verification that the function interactions were triggered
    expect(showToast).toHaveBeenCalled();
    expect(execAsyncMock).toHaveBeenCalled();
  });
});
