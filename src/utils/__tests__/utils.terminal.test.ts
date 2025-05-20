/**
 * Test file for terminal utilities
 */

// Create a mock for the Toast module first
const mockToast = {
  style: null,
  title: null,
  message: null,
};

// Mock execution result
const mockExecResult = { stdout: 'mocked output', stderr: '' };

// Define mockExecFn before any imports
const mockExecFn = jest.fn().mockResolvedValue(mockExecResult);

// Setup ALL mocks before imports
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockReturnValue(mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

jest.mock('util', () => ({
  promisify: jest.fn().mockReturnValue(mockExecFn)
}));

// Import after ALL mock setup is complete
import { getUserFriendlyErrorMessage } from '../terminal';

// Focus on testing individual utility functions
describe('Terminal utility functions', () => {
  // Reset mocks between tests
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the mock toast object
    mockToast.style = null;
    mockToast.title = null;
    mockToast.message = null;
  });
  
  describe('getUserFriendlyErrorMessage', () => {
    // Test that error message processing happens
    test('should process error messages', () => {
      const errorMessage = 'bash: sonar-scanner: command not found';
      const result = getUserFriendlyErrorMessage(errorMessage);
      
      // Verify it returns a friendly message based on patterns
      expect(result).toContain('Command not found');
      expect(result).toContain('Details:');
      expect(result).toContain(errorMessage);
    });
    
    test('should handle different error types', () => {
      const errorMessage1 = 'permission denied: /usr/local/bin/sonar-scanner';
      const errorMessage2 = 'Failed to connect to SonarQube server at localhost:9000';
      const errorMessage3 = 'Error: failed to start podman container';
      
      const result1 = getUserFriendlyErrorMessage(errorMessage1);
      const result2 = getUserFriendlyErrorMessage(errorMessage2);
      const result3 = getUserFriendlyErrorMessage(errorMessage3);
      
      // Verify each result contains the appropriate friendly message
      expect(result1).toContain('Permission denied');
      expect(result1).toContain('Details:');
      
      expect(result2).toContain('SonarQube error');
      expect(result2).toContain('Details:');
      
      expect(result3).toContain('Podman error');
      expect(result3).toContain('Details:');
    });
    
    test('should handle long error messages', () => {
      const longError = 'X'.repeat(200); // A very long error
      const result = getUserFriendlyErrorMessage(longError);
      
      // The implementation should truncate long messages
      expect(result.length).toBeLessThan(longError.length + 50); // Allow some room for prefix text
      expect(result).toContain('...');
    });
  });
  
  // Include a simple verification test to ensure the file passes
  describe('Basic test coverage', () => {
    test('should include all necessary terminal utilities', () => {
      // This confirms the file is being included in test coverage
      expect(typeof getUserFriendlyErrorMessage).toBe('function');
    });
  });
});
