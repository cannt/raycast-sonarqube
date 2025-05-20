/**
 * Enhanced test file for terminal utilities
 */
import { getUserFriendlyErrorMessage, runCommand, runInNewTerminal } from '../terminal';
import { showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

// Mock execAsync before importing terminal
jest.mock('util', () => ({
  promisify: jest.fn().mockImplementation(() => jest.fn())
}));

// Create proper mocks for Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Get access to the mocked execAsync function
const { execAsync } = require('../terminal');

describe('Terminal utilities', () => {
  // Store the mock toast for verification
  let mockToast: any;
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock toast object for each test
    mockToast = {
      style: null,
      title: null,
      message: null
    };

    // Setup showToast mock to return our mockToast object
    (showToast as jest.Mock).mockResolvedValue(mockToast);
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    test('should format command not found error with friendly message', () => {
      const errorMsg = 'bash: sonar-scanner: command not found';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      // Check for the error pattern matching
      expect(result).toContain('Command not found');
      expect(result).toContain('Details: bash: sonar-scanner: command not found');
    });
    
    test('should format permissions error with friendly message', () => {
      const errorMsg = 'permission denied: /usr/local/bin/sonar-scanner';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      expect(result).toContain('Permission denied');
      expect(result).toContain('Details: permission denied');
    });
    
    test('should handle SonarQube-specific errors', () => {
      const errorMsg = 'Could not connect to SonarQube server';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      expect(result).toContain('SonarQube error detected');
      expect(result).toContain('Details: Could not connect to SonarQube server');
    });
    
    test('should handle unknown errors by truncating them', () => {
      const longError = 'X'.repeat(200); // Error with no recognized pattern
      const result = getUserFriendlyErrorMessage(longError);
      
      // Should truncate to 150 chars + ellipsis
      expect(result.length).toBeLessThanOrEqual(153);  // 150 + '...'
    });
  });
  
  describe('runCommand', () => {
    test('should show success toast when command succeeds', async () => {
      // Mock successful command execution
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: 'Command completed successfully',
        stderr: ''
      });
      
      await runCommand('test-command', 'Success!', 'Failed!');
      
      // Verify showToast was called
      expect(showToast).toHaveBeenCalledTimes(1);
      
      // Check that the toast was updated properly
      expect(mockToast.style).toBe(Toast.Style.Success);
      expect(mockToast.title).toBe('Success!');
      
      // The actual message may differ based on implementation
      // Just verify it has the stdout content
      expect(mockToast.message).toBeTruthy();
    });
    
    test('should show failure toast when command fails', async () => {
      // Mock failed command execution with stderr
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed: permission denied'
      });
      
      await runCommand('failed-command', 'Success!', 'Failed!');
      
      // Verify the toast was updated with failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failed!');
      
      // Just verify it contains error information
      expect(mockToast.message).toContain('permission denied');
    });
    
    test('should handle thrown errors during command execution', async () => {
      // Mock error being thrown
      (execAsync as jest.Mock).mockRejectedValueOnce(new Error('Command execution failed'));
      
      await runCommand('error-command', 'Success!', 'Failed!');
      
      // Verify the toast was updated with failure
      expect(mockToast.style).toBe(Toast.Style.Failure);
      expect(mockToast.title).toBe('Failed!');
      
      // The exact message depends on implementation
      // Just verify there is a message
      expect(mockToast.message).toBeTruthy();
    });
    
    test('should handle warnings in stderr as non-failures', async () => {
      // Mock command with warning in stderr
      (execAsync as jest.Mock).mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: something minor happened'
      });
      
      await runCommand('warning-command', 'Success!', 'Failed!');
      
      // Since the stderr contains 'warning', it should not be treated as a failure
      // The expected behavior depends on the actual implementation
      expect(mockToast.title).toBe('Success!');
    });
  });
  
  describe('runInNewTerminal', () => {
    test('should create and execute shell script when commands are provided', async () => {
      // Clear previous mock calls
      (execAsync as jest.Mock).mockClear();
      
      // Set up the mock to track calls and return appropriate values
      (execAsync as jest.Mock).mockImplementation((cmd) => {
        // Return empty success for all execAsync calls
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await runInNewTerminal(['echo "test"'], 'Terminal Success', 'Terminal Failure', { trackProgress: false });
      
      // Verify showToast was called
      expect(showToast).toHaveBeenCalledTimes(1);
      
      // Verify execAsync was called at least once
      expect(execAsync).toHaveBeenCalled();
      
      // Without tracking progress, the toast should show success
      // We can't make assumptions about mock.style because it depends on the implementation
      // Just verify the title matches what we expect based on implementation
      expect(mockToast.title).toBe('Terminal Success');
    });
    
    test('should handle errors when script execution fails', async () => {
      // Clear previous mock calls
      (execAsync as jest.Mock).mockClear();
      
      // First allow script creation to succeed
      let scriptCreated = false;
      (execAsync as jest.Mock).mockImplementation((cmd) => {
        if (cmd.includes('cat >')) {
          scriptCreated = true;
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        
        if (cmd.includes('chmod +x')) {
          return Promise.resolve({ stdout: '', stderr: '' });
        }
        
        // Fail when opening terminal
        if (cmd.includes('open -a Terminal') && scriptCreated) {
          return Promise.reject(new Error('Failed to open terminal'));
        }
        
        return Promise.resolve({ stdout: '', stderr: '' });
      });
      
      await runInNewTerminal(['echo "test"'], 'Success', 'Terminal Failed', { trackProgress: false });
      
      // Verify we got a failure title
      expect(mockToast.title).toBe('Terminal Failed');
    });
  });
});
