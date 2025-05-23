/**
 * Test for getUserFriendlyErrorMessage
 * This test matches the current implementation which uses pattern matching to provide helpful error messages
 */
import { getUserFriendlyErrorMessage } from '../terminal';

describe('getUserFriendlyErrorMessage', () => {
  test('handles standard error messages', () => {
    const errorMsg = 'some random error';
    const result = getUserFriendlyErrorMessage(errorMsg);
    // Default case for unrecognized patterns - returns truncated error
    expect(result).toBe(errorMsg);
  });

  test('provides friendly message for command not found errors', () => {
    const errorMsg = 'bash: command not found';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toContain('Command not found');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('provides friendly message for permission denied errors', () => {
    const errorMsg = 'permission denied';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toContain('Permission denied');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('provides friendly message for SonarQube specific errors', () => {
    const errorMsg = 'Error connecting to sonarqube server';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toContain('SonarQube error detected');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('provides friendly message for no such file errors', () => {
    const errorMsg = 'no such file or directory';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toContain('File or directory not found');
    expect(result).toContain(`Details: ${errorMsg}`);
  });

  test('handles long error messages with truncation', () => {
    const longError = 'x'.repeat(200);
    const result = getUserFriendlyErrorMessage(longError);
    
    // Standard errors get truncated to 150 chars + '...' if needed
    expect(result.length).toBe(153); // 150 chars + '...'
    expect(result.endsWith('...')).toBe(true);
  });

  test('handles empty error messages', () => {
    const result = getUserFriendlyErrorMessage('');
    expect(result).toBe('');
  });
});
