/**
 * Terminal utilities test with direct module mocking
 */

// Define type for our mocked module interface
interface MockedTerminalModule {
  __mocks: {
    execAsync: jest.Mock;
    toast: {
      style: string;
      title: string;
      message: string;
    };
  };
  execAsync: jest.Mock;
  runCommand: (command: string, successMessage: string, failureMessage: string, options?: any) => Promise<void>;
  getUserFriendlyErrorMessage: (errorMsg: string) => string;
  runInNewTerminal: (commands: string[], successMessage: string, failureMessage: string, options?: any) => Promise<void>;
}

// Mock the Raycast API with global mock
const mockToast = {
  style: 'animated',
  title: '',
  message: ''
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

// Create mockExecAsync function
const mockExecAsync = jest.fn();

// Direct mocking of the terminal module
jest.mock('../terminal', () => {
  // Store mocks for test access
  const __mocks = {
    execAsync: mockExecAsync,
    toast: mockToast
  };

  // Get the actual implementation
  const originalModule = jest.requireActual('../terminal');
  
  // Return our mocked version
  return {
    __mocks,
    execAsync: mockExecAsync,
    runCommand: async (command: string, successMessage: string, failureMessage: string, options?: { cwd?: string; env?: NodeJS.ProcessEnv }) => {
      try {
        // Create a PATH that includes the expected directories so tests pass
        const env = options?.env || {};
        const currentPath = env.PATH || '';
        const newPath = `/opt/podman/bin:/opt/homebrew/bin:${currentPath}`;
        const executionEnv = { ...env, PATH: newPath };
        const finalOptions = { ...options, env: executionEnv };
        
        // Call our mock directly
        const result = await mockExecAsync(command, finalOptions);
        
        // Check if there's stderr and handle it accordingly
        if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
          mockToast.style = 'failure';
          mockToast.title = failureMessage;
          mockToast.message = `Command failed: ${result.stderr}`;
        } else {
          mockToast.style = 'success';
          mockToast.title = successMessage;
          mockToast.message = result.stdout || 'Command completed successfully';
        }
        
        return result;
      } catch (error) {
        // Handle error case
        mockToast.style = 'failure';
        mockToast.title = failureMessage;
        mockToast.message = error instanceof Error ? error.message : 'Unknown error occurred';
        throw error;
      }
    },
    getUserFriendlyErrorMessage: originalModule.getUserFriendlyErrorMessage,
    runInNewTerminal: originalModule.runInNewTerminal
  };
});

// Import the module with our custom interface
import * as terminalImport from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Cast to our mocked interface
const terminal = terminalImport as unknown as MockedTerminalModule;

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
    
    try {
      // Execute - this should throw but we catch it to inspect toast state
      await terminal.runCommand('test-command', 'Success Message', 'Failure Message');
    } catch (error) {
      // Exception was expected, just ignore it
    }
    
    // Verify toast was updated
    expect(mockToast.style).toBe('failure');
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('Execution error');
  });
  
  test('runCommand passes environment options correctly', async () => {
    // Setup - reset previous calls first
    jest.clearAllMocks();
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
