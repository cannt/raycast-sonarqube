/**
 * Fixed test for runCommand terminal utility function
 */

// Mock Raycast API first
const mockToast = {
  style: 'animated',
  title: 'Initial Toast',
  message: 'Initial message'
};

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

// Mock execAsync
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output for tests
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

// Import after mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('runCommand function', () => {
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
    // Reset toast state before each test
    mockToast.style = 'animated';
    mockToast.title = 'Initial Toast';
    mockToast.message = 'Initial message';
  });
  
  test('execAsync is called with correct command', async () => {
    // Setup mock to return successful output
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify execAsync was called with the right command
    expect(mockExecAsync).toHaveBeenCalled();
    expect(mockExecAsync.mock.calls[0][0]).toBe('test-command');
  });
  
  test('updates toast to success when command succeeds', async () => {
    // Setup mock to return successful output
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command successful output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify toast was updated correctly to success state
    expect(showToast).toHaveBeenCalled();
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Command Succeeded');
  });
  
  test('updates toast to failure when command has stderr', async () => {
    // Setup mock to return error output
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command error output'
    });
    
    // Call the function
    await runCommand('test-command', 'Command Succeeded', 'Command Failed');
    
    // Verify toast was updated correctly to failure state
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Command Failed');
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
