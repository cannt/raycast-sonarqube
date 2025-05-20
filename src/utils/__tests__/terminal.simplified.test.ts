/**
 * Comprehensive test for terminal utilities
 * Following the iterative testing methodology from test-fixing-workflow
 */

// Step 1: First define our mocks before importing the module under test

// Mock the execAsync function
const mockExecAsync = jest.fn();

// Create a mock toast object we can inspect in tests
const mockToast = {
  // Properties to track toast state
  style: 'animated',  // Start with animated style (matches Toast.Style.Animated)
  title: '',
  message: '',
  // A function to track all property updates
  updates: [] as {property: string, value: any}[],
  // Setter method that records all updates
  set: jest.fn((props) => {
    // Record all updates
    Object.entries(props).forEach(([key, value]) => {
      mockToast.updates.push({property: key, value});
      // Also update our tracking properties
      if (key === 'style') mockToast.style = value as string;
      if (key === 'title') mockToast.title = value as string;
      if (key === 'message') mockToast.message = value as string;
    });
  }),
  // Reset for test setup
  reset() {
    this.style = 'animated';
    this.title = '';
    this.message = '';
    this.updates = [];
    this.set.mockClear();
  }
};

// Step 2: Mock dependencies
jest.mock('util', () => ({
  // Mock promisify to return our mock function
  promisify: jest.fn(() => mockExecAsync)
}));

jest.mock('@raycast/api', () => ({
  // Mock showToast to return our instrumented toast object
  showToast: jest.fn((props) => {
    // Set initial properties
    if (props.style) mockToast.style = props.style;
    if (props.title) mockToast.title = props.title;
    if (props.message) mockToast.message = props.message || '';
    
    // Return our toast object with setters
    return mockToast;
  }),
  // Mock Toast styles
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Step 3: Import the module under test AFTER mocking dependencies
import { runCommand, getUserFriendlyErrorMessage } from '../terminal';
import { Toast } from '@raycast/api';

// Step 4: Suppress console output to keep test output clean
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Terminal Utilities', () => {
  // Setup and teardown
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });
  
  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });
  
  beforeEach(() => {
    // Reset all mocks before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    mockToast.reset();
  });

  describe('getUserFriendlyErrorMessage', () => {
    test('prefixes error messages with "Friendly:"', () => {
      const result = getUserFriendlyErrorMessage('some error message');
      expect(result).toBe('Friendly: some error message');
    });
  });

  describe('runCommand', () => {
    test('shows animated toast initially', async () => {
      // Setup - mock a successful command execution
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Execute the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast was initially shown with animated style
      expect(mockToast.style).toBe(Toast.Style.Animated);
      expect(mockToast.title).toContain('Running:');
    });
    
    test('shows success toast when command succeeds', async () => {
      // Setup - mock a successful command execution
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command executed successfully',
        stderr: ''
      });
      
      // Execute the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find style update to success in the recorded updates
      const successUpdate = mockToast.updates.find(u => 
        u.property === 'style' && u.value === Toast.Style.Success
      );
      expect(successUpdate).toBeDefined();
      
      // Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success');
      expect(mockToast.message).toContain('Command executed successfully');
    });
    
    test('shows failure toast when command has stderr', async () => {
      // Setup - mock command with error output
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed with an error'
      });
      
      // Execute the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find style update to failure in the recorded updates
      const failureUpdate = mockToast.updates.find(u => 
        u.property === 'style' && u.value === Toast.Style.Failure
      );
      expect(failureUpdate).toBeDefined();
      
      // Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure');
    });
    
    test('treats warnings in stderr as non-failures', async () => {
      // Setup - mock command with warning
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning message'
      });
      
      // Execute the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find style update to success
      const successUpdate = mockToast.updates.find(u => 
        u.property === 'style' && u.value === Toast.Style.Success
      );
      expect(successUpdate).toBeDefined();
      
      // Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success');
    });
    
    test('shows failure toast when command throws exception', async () => {
      // Setup - mock rejection
      mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Execute the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find style update to failure
      const failureUpdate = mockToast.updates.find(u => 
        u.property === 'style' && u.value === Toast.Style.Failure
      );
      expect(failureUpdate).toBeDefined();
      
      // Verify final toast state
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure');
    });
    
    test('passes environment options correctly', async () => {
      // Setup - mock successful execution
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Success with options',
        stderr: ''
      });
      
      // Custom options to test
      const options = { 
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      // Execute with options
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Verify execAsync was called with correct options
      expect(mockExecAsync).toHaveBeenCalledWith(
        'test-command',
        expect.objectContaining({
          cwd: '/custom/path',
          env: expect.objectContaining({
            CUSTOM_VAR: 'value',
            PATH: expect.any(String)
          })
        })
      );
    });
  });
});
