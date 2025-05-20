/**
 * Minimal test for runCommand focusing on basic functionality
 */

// Mock setup needs to happen before imports

// Mock execAsync with specific implementation for each test
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create mock toast with correct properties and methods
const mockToast = {
  style: 'animated',
  title: 'Initial Title',
  message: 'Initial Message',
  hide: jest.fn()
};

// Mock the showToast function to update and return our mockToast
jest.mock('@raycast/api', () => {
  return {
    showToast: jest.fn().mockImplementation((config) => {
      if (config) {
        mockToast.style = config.style || mockToast.style;
        mockToast.title = config.title || mockToast.title;
        mockToast.message = config.message || mockToast.message;
      }
      return mockToast;
    }),
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    },
    openExtensionPreferences: jest.fn()
  };
});

// Suppress console output during tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks are established
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand - minimal test', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset toast state before each test
    mockToast.style = 'animated';
    mockToast.title = 'Initial Toast';
    mockToast.message = 'Initial message';
  });
  
  // Restore console after all tests
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  test('shows animated toast initially', async () => {
    // Setup mock to return empty output
    mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });
    
    // Call the function
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called with correct initial parameters
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: Toast.Style.Animated,
      title: expect.stringContaining('Running:')
    }));
  });
  
  test('updates toast to success when command succeeds', async () => {
    // Setup mock to return successful output
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command successful output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify showToast was called at least once
    expect(showToast).toHaveBeenCalled();
    
    // Verify toast was updated correctly to success state
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Command Succeeded');
    expect(mockToast.message).toContain('Command successful output');
  });
  
  test('updates toast to failure when command has stderr', async () => {
    // Setup mock to return error output
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command error output'
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify showToast was called at least once
    expect(showToast).toHaveBeenCalled();
    
    // Verify toast was updated correctly to failure state
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Command Failed');
    expect(mockToast.message).toContain('Command error output');
  });
  
  test('treats stderr warnings as success', async () => {
    // Setup mock to return output with warning
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Standard output',
      stderr: 'Warning: This is just a warning'
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify showToast was called at least once
    expect(showToast).toHaveBeenCalled();
    
    // Should still be success because stderr only contains a warning
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Command Succeeded');
  });
  
  test('handles command execution errors', async () => {
    // Setup mock to throw an error
    mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify showToast was called at least once
    expect(showToast).toHaveBeenCalled();
    
    // Should show failure toast
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Command Failed');
    expect(mockToast.message).toContain('Command execution failed');
  });
});
