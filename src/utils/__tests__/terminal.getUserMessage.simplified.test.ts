/**
 * Simplified test for getUserFriendlyErrorMessage
 * This test matches the actual implementation which simply prepends "Friendly: " to all error messages
 */
import { getUserFriendlyErrorMessage } from '../terminal';

describe('getUserFriendlyErrorMessage', () => {
  test('prepends "Friendly: " to standard error messages', () => {
    const errorMsg = 'some random error';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(`Friendly: ${errorMsg}`);
  });

  test('prepends "Friendly: " to command not found errors', () => {
    const errorMsg = 'bash: command not found';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(`Friendly: ${errorMsg}`);
  });

  test('prepends "Friendly: " to permission denied errors', () => {
    const errorMsg = 'permission denied';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(`Friendly: ${errorMsg}`);
  });

  test('prepends "Friendly: " to SonarQube specific errors', () => {
    const errorMsg = 'Error connecting to sonarqube server';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(`Friendly: ${errorMsg}`);
  });

  test('prepends "Friendly: " to no such file errors', () => {
    const errorMsg = 'no such file or directory';
    const result = getUserFriendlyErrorMessage(errorMsg);
    expect(result).toBe(`Friendly: ${errorMsg}`);
  });

  test('handles long error messages without truncation', () => {
    const longError = 'x'.repeat(200);
    const result = getUserFriendlyErrorMessage(longError);
    
    expect(result.startsWith('Friendly: ')).toBe(true);
    expect(result.length).toBe(longError.length + 'Friendly: '.length);
  });

  test('handles empty error messages', () => {
    const result = getUserFriendlyErrorMessage('');
    expect(result).toBe('Friendly: ');
  });
});
