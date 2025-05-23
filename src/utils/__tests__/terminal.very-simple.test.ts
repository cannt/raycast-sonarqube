/**
 * Very minimal test for getUserFriendlyErrorMessage
 * Following the iterative test-fixing methodology
 */
// Import our function to test
import { getUserFriendlyErrorMessage } from '../terminal';

// Silence console output
console.log = jest.fn();
console.error = jest.fn();

describe('Terminal Utilities - Single Focus', () => {
  // Test the getUserFriendlyErrorMessage function with various error patterns
  describe('getUserFriendlyErrorMessage', () => {
    test('provides user-friendly message for command not found errors', () => {
      const errorMsg = 'bash: command not found';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      expect(result).toContain('Command not found');
      expect(result).toContain('Details: bash: command not found');
    });
    
    test('provides user-friendly message for permission denied errors', () => {
      const errorMsg = 'permission denied';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      expect(result).toContain('Permission denied');
      expect(result).toContain('Details: permission denied');
    });
    
    test('handles standard error messages', () => {
      const errorMsg = 'some random error';
      const result = getUserFriendlyErrorMessage(errorMsg);
      
      // Default case for unrecognized patterns - returns the error as-is or truncated
      expect(result).toBe(errorMsg);
    });
    
    test('handles empty error messages', () => {
      const result = getUserFriendlyErrorMessage('');
      expect(result).toBe('');
    });
    
    test('truncates very long error messages', () => {
      const longError = 'x'.repeat(200);
      const result = getUserFriendlyErrorMessage(longError);
      
      expect(result.length).toBe(153); // 150 chars + '...'
      expect(result.endsWith('...')).toBe(true);
    });
  });
});
