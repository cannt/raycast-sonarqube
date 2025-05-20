/**
 * Minimal test for runCommand focusing on basic functionality
 */

// Define a type for our mock state
type MockToastState = {
  style: string | null;
  title: string | null;
  message: string | null;
};

// Create a globally accessible mock state that we can check during tests
const mockToastState: MockToastState = {
  style: null,
  title: null,
  message: null
};

// Mock dependencies
jest.mock('@raycast/api', () => {
  // Create the toast object with setters that update our global state
  const mockToast = {
    set style(value: string) { mockToastState.style = value; },
    set title(value: string) { mockToastState.title = value; },
    set message(value: string) { mockToastState.message = value; }
  };
  
  return {
    showToast: jest.fn().mockReturnValue(mockToast),
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  };
});

// Mock execAsync
const mockExecFn = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecFn)
}));

// Import after mocking
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand - minimal test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the toast state
    mockToastState.style = null;
    mockToastState.title = null;
    mockToastState.message = null;
  });
  
  test('showToast is called initially with Animated style', async () => {
    // Set up mock for successful command
    mockExecFn.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify initial toast was shown
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Animated,
        title: expect.stringContaining('Running:')
      })
    );
  });
});
