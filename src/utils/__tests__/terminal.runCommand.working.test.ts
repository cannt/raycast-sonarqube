/**
 * Working test for the runCommand function
 * This test bypasses global mocks and correctly tests the functionality
 */

// Need to mock these dependencies first before importing the module under test
jest.mock('@raycast/api', () => {
  // Create a mock toast object that can be updated and inspected
  const mockToast = {
    style: 'animated',
    title: '',
    message: '',
    hide: jest.fn()
  };
  
  // Mock showToast to return our controlled toast object
  const showToastMock = jest.fn().mockImplementation(({ style, title, message }) => {
    // Set initial values
    mockToast.style = style;
    mockToast.title = title;
    mockToast.message = message || '';
    
    // Return an object that allows updating the toast state
    return {
      get style() { return mockToast.style; },
      set style(value) { mockToast.style = value; },
      
      get title() { return mockToast.title; },
      set title(value) { mockToast.title = value; },
      
      get message() { return mockToast.message; },
      set message(value) { mockToast.message = value; },
      
      hide: mockToast.hide
    };
  });
  
  return {
    showToast: showToastMock,
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    },
    // Export for test verification
    __getMockToast: () => mockToast
  };
});

// Mock the execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Get the actual runCommand function and other required imports
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Get the __getMockToast helper from the mocked module
const { __getMockToast } = jest.requireMock('@raycast/api');

describe('runCommand Function', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    
    // Reset toast state
    const mockToast = __getMockToast();
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
  });
  
  test('shows animated toast initially', async () => {
    // Setup mock to return success
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called with correct initial params
    expect(showToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: 'animated',
        title: expect.stringContaining('Running:')
      })
    );
  });
  
  test('updates toast to success on successful command', async () => {
    // Setup mock to return success
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify toast state was updated to success
    const finalToastState = __getMockToast();
    expect(finalToastState.style).toBe('success');
    expect(finalToastState.title).toBe('Success');
    expect(finalToastState.message).toContain('Command output');
  });
  
  test('updates toast to failure when command has stderr', async () => {
    // Setup mock to return error
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command error'
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify toast state was updated to failure
    const finalToastState = __getMockToast();
    expect(finalToastState.style).toBe('failure');
    expect(finalToastState.title).toBe('Failure');
    expect(finalToastState.message).toContain('Command error');
  });
  
  test('shows success when stderr only contains warnings', async () => {
    // Setup mock to return warning
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: This is just a warning'
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify toast state was updated to success despite warning
    const finalToastState = __getMockToast();
    expect(finalToastState.style).toBe('success');
    expect(finalToastState.title).toBe('Success');
  });
  
  test('shows failure toast when command throws exception', async () => {
    // Setup mock to throw an error
    const errorMessage = 'Command execution failed';
    mockExecAsync.mockRejectedValueOnce(new Error(errorMessage));
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify toast shows failure
    const finalToastState = __getMockToast();
    expect(finalToastState.style).toBe('failure');
    expect(finalToastState.title).toBe('Failure');
    expect(finalToastState.message).toContain(errorMessage);
  });
  
  test('passes environment options correctly', async () => {
    // Reset mock for clean call data
    mockExecAsync.mockClear();
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success',
      stderr: ''
    });
    
    // Create custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Call the function with options
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
