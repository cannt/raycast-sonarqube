/**
 * Terminal utilities test with direct module mocking
 */

// Direct mocking of the terminal module
jest.mock('../terminal', () => {
  // Create our mocks first
  const mockExecAsync = jest.fn();
  const mockToast = {
    style: 'animated',
    title: '',
    message: ''
  };

  // Store them for test access
  const __mocks = {
    execAsync: mockExecAsync,
    toast: mockToast
  };

  // Mock the Raycast API within this context
  jest.mock('@raycast/api', () => ({
    showToast: jest.fn(() => mockToast),
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  }), { virtual: true });

  // Get the actual implementation but with our mocks applied
  const originalModule = jest.requireActual('../terminal');
  
  // Return a mock that preserves the module API but uses our mocks
  return {
    __mocks,
    execAsync: mockExecAsync,
    runCommand: async (command, successMessage, failureMessage, options) => {
      // Capture the call for testing
      const result = await originalModule.runCommand(command, successMessage, failureMessage, options);
      return result;
    },
    getUserFriendlyErrorMessage: originalModule.getUserFriendlyErrorMessage,
    runInNewTerminal: originalModule.runInNewTerminal
  };
});

// Import the module
import * as terminal from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Access the mocks
const mockExecAsync = terminal.__mocks.execAsync;
const mockToast = terminal.__mocks.toast;

// Suppress console logs
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal Utilities (Direct Mock)', () => {
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
  
  test('runCommand calls execAsync with correct parameters', async () => {
    // Setup
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Execute
    await terminal.runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify execAsync was called correctly
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        env: expect.objectContaining({
          PATH: expect.stringContaining('/opt')
        })
      })
    );
  });
  
  test('runCommand updates toast on success', async () => {
    // Setup
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command succeeded',
      stderr: ''
    });
    
    // Execute
    await terminal.runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe('success');
    expect(mockToast.title).toBe('Success Message');
  });
  
  test('runCommand updates toast on failure', async () => {
    // Setup
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command failed'
    });
    
    // Execute
    await terminal.runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure Message');
  });
  
  test('runCommand handles exceptions', async () => {
    // Setup
    mockExecAsync.mockRejectedValueOnce(new Error('Execution error'));
    
    // Execute
    await terminal.runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('Execution error');
  });
  
  test('runCommand passes environment options correctly', async () => {
    // Setup
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command succeeded',
      stderr: ''
    });
    
    // Custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Execute
    await terminal.runCommand('test-command', 'Success', 'Failure', options);
    
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
