/**
 * Working test file for terminal.ts functions
 */

// Mock imports must be defined before importing actual modules
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(() => ({
    style: null,
    title: null,
    message: null
  })),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Now import the code under test
import { getUserFriendlyErrorMessage, runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal utility functions', () => {
  // Test setup/teardown
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
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('recognizes command not found errors', () => {
      const result = getUserFriendlyErrorMessage('bash: command not found');
      expect(result).toContain('Command not found');
    });
    
    test('recognizes permission denied errors', () => {
      const result = getUserFriendlyErrorMessage('permission denied');
      expect(result).toContain('Permission denied');
    });
    
    test('recognizes SonarQube specific errors', () => {
      const result = getUserFriendlyErrorMessage('Error connecting to sonarqube server');
      expect(result).toContain('SonarQube error');
    });
    
    test('provides default message for unknown errors', () => {
      const result = getUserFriendlyErrorMessage('some random error');
      expect(result).toContain('Friendly');
      expect(result).toContain('some random error');
    });
  });
  
  describe('runCommand', () => {
    // Define mock toast with proper typing
    let mockToast: {
      style: string | null;
      title: string | null;
      message: string | null;
    };
    
    beforeEach(() => {
      // Reset the mock toast for each test
      mockToast = {
        style: null,
        title: null,
        message: null
      };
      
      // Configure showToast to return our mockToast
      (showToast as jest.Mock).mockImplementation((props) => {
        // Clone the toast object and set initial properties
        const toast = { ...mockToast };
        toast.style = props.style;
        toast.title = props.title;
        toast.message = props.message;
        
        // Define setters that will update our mockToast object
        Object.defineProperties(toast, {
          style: {
            get: () => mockToast.style,
            set: (v) => { mockToast.style = v; }
          },
          title: {
            get: () => mockToast.title,
            set: (v) => { mockToast.title = v; }
          },
          message: {
            get: () => mockToast.message,
            set: (v) => { mockToast.message = v; }
          }
        });
        
        return toast;
      });
    });
    
    test('shows success toast on successful command execution', async () => {
      // Arrange: Set up mock for successful command
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command succeeded',
        stderr: ''
      });
      
      // Act
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
      expect(mockToast.message).toContain('Command succeeded');
    });
    
    test('shows failure toast when stderr contains errors', async () => {
      // Arrange: Set up mock for command with errors
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed with error'
      });
      
      // Act
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      expect(mockToast.message).toContain('Command failed with error');
    });
    
    test('shows success toast when stderr only contains warnings', async () => {
      // Arrange: Set up mock with warning in stderr
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output with warning',
        stderr: 'warning: This is just a warning'
      });
      
      // Act
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success Message');
      expect(mockToast.message).toContain('Command output with warning');
    });
    
    test('handles exceptions by showing failure toast', async () => {
      // Arrange: Set up mock to throw error
      mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
      
      // Act
      await runCommand('test-command', 'Success Message', 'Failure Message');
      
      // Assert
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failure Message');
      expect(mockToast.message).toContain('Command execution failed');
    });
    
    test('passes environment options correctly', async () => {
      // Arrange: Set up mock for success
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Success with options',
        stderr: ''
      });
      
      const options = {
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      // Act
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Assert
      expect(mockExecAsync).toHaveBeenCalled();
      
      const callArgs = mockExecAsync.mock.calls[0];
      expect(callArgs[0]).toBe('test-command');
      expect(callArgs[1].cwd).toBe('/custom/path');
      expect(callArgs[1].env.CUSTOM_VAR).toBe('value');
      
      // PATH should be modified in the environment
      expect(callArgs[1].env.PATH).toBeTruthy();
    });
  });
});
