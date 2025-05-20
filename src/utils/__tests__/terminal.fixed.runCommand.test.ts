/**
 * Focused minimal test for terminal.runCommand
 * Following the iterative approach to fix failing tests
 */

// Create a mockToast object that simulates the toast API
const mockToast = {
  style: 'animated',  // Initial style
  title: '',
  message: '',
  hide: jest.fn()
};

// Mock the Raycast API before import
const mockShowToast = jest.fn().mockResolvedValue(mockToast);
jest.mock('@raycast/api', () => ({
  showToast: mockShowToast,
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  },
  openExtensionPreferences: jest.fn()
}));

// Mock the execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks are established
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand - minimal test', () => {
  // Reset mock state between tests
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
  });
  
  test('shows success toast when command succeeds', async () => {
    // Configure mock to return successful execution
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Execute command
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called at least once
    expect(mockShowToast).toHaveBeenCalled();
    
    // Verify the toast object was updated with success state
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Success');
  });
});
