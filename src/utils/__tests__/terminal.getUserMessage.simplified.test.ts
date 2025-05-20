/**
 * Simplified test for getUserFriendlyErrorMessage
 * This test doesn't rely on complex mocking
 */
import { getUserFriendlyErrorMessage } from '../terminal';

describe('getUserFriendlyErrorMessage', () => {
  test('returns original error for unrecognized patterns', () => {
    const errorMsg = 'some random error';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(errorMsg);
  });

  test('recognizes command not found errors', () => {
    const errorMsg = 'bash: command not found';
    const result = getUserFriendlyErrorMessage(errorMsg);
    
    // Check that the result contains the expected message from ERROR_PATTERNS
    expect(result).toContain('Command not found. Make sure all required tools are installed.');
    // Check that it includes the original error details
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('recognizes permission denied errors', () => {
    const errorMsg = 'permission denied';
    const result = getUserFriendlyErrorMessage(errorMsg);
    
    expect(result).toContain('Permission denied. You may need to run with higher privileges.');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('recognizes SonarQube specific errors', () => {
    const errorMsg = 'Error connecting to sonarqube server';
    const result = getUserFriendlyErrorMessage(errorMsg);
    
    expect(result).toContain('SonarQube error detected. Verify SonarQube server status and configuration.');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('recognizes no such file or directory errors', () => {
    const errorMsg = 'no such file or directory';
    const result = getUserFriendlyErrorMessage(errorMsg);
    
    expect(result).toContain('File or directory not found. Check that paths are correct.');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('truncates long error messages for unrecognized patterns', () => {
    const longError = 'x'.repeat(200);
    const result = getUserFriendlyErrorMessage(longError);
    
    // For unrecognized patterns, it should truncate to 150 chars + '...'
    expect(result.length).toBe(153); // 150 chars + '...'
    expect(result).toContain('...');
  });

  test('handles empty error messages', () => {
    const result = getUserFriendlyErrorMessage('');
    // Empty messages don't match any pattern, so they're returned as-is
    expect(result).toBe('');
  });
});
