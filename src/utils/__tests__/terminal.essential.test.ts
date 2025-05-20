/**
 * Essential test for terminal utilities
 * Following the iterative methodology for test fixing
 */

// Create a shared mock toast that we can reference directly
const mockToast = {
  style: 'animated',
  title: '',
  message: ''
};

// First, mock the modules that terminal.ts depends on
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

// Mock util.promisify and exec
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output to keep test output clean
const originalConsole = {
  log: console.log,
  error: console.error
};
console.log = jest.fn();
console.error = jest.fn();

// Import after all mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

describe('Terminal Utilities', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset mock toast state
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
  });
  
  afterAll(() => {
    // Restore console functions
    console.log = originalConsole.log;
    console.error = originalConsole.error;
  });
  
  test('successfully runs command and shows success toast', async () => {
    // Arrange: Setup mock for successful command
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command successful output',
      stderr: ''
    });
    
    // Act: Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Assert: Verify showToast was called with animated style initially
    expect(showToast).toHaveBeenCalledWith(expect.objectContaining({
      style: Toast.Style.Animated,
      title: expect.stringContaining('Running:')
    }));
    
    // We already have access to the mockToast directly
    
    // Assert: Verify toast was updated to success
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Success Message');
    expect(mockToast.message).toContain('Command successful output');
  });
  
  test('shows failure toast when command outputs to stderr', async () => {
    // Arrange: Setup mock with error output
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command failed with error'
    });
    
    // Act: Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // We already have access to the mockToast directly
    
    // Assert: Verify toast shows failure
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('failed');
  });
  
  test('treats stderr warnings as success', async () => {
    // Arrange: Setup mock with warning in stderr
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: Just a warning message'
    });
    
    // Act: Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // We already have access to the mockToast directly
    
    // Assert: Verify toast still shows success
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Success Message');
  });
  
  test('handles command exceptions', async () => {
    // Arrange: Setup mock to throw error
    mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Act: Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // We already have access to the mockToast directly
    
    // Assert: Verify toast shows failure
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('Command execution failed');
  });
  
  test('passes environment options correctly', async () => {
    // Arrange: Setup mock for success
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: ''
    });
    
    // Clear the mock to ensure we get clean call data
    mockExecAsync.mockClear();
    
    // Act: Run command with custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Assert: Verify execAsync was called with correct parameters
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
