/**
 * Test for getUserFriendlyErrorMessage that bypasses the global mock
 */

// Explicitly get the real implementation, not the mocked one
const actualTerminal = jest.requireActual('../terminal');
const { getUserFriendlyErrorMessage } = actualTerminal;

describe('getUserFriendlyErrorMessage - Actual Implementation', () => {
  test('returns formatted message for command not found errors', () => {
    const error = 'bash: somecommand: command not found';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Command not found');
    expect(result).toContain('Make sure all required tools are installed');
    expect(result).toContain(error.substring(0, 50)); // Should contain part of original error
  });

  test('returns formatted message for permission denied errors', () => {
    const error = 'permission denied: /some/file';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Permission denied');
    expect(result).toContain('You may need to run with higher privileges');
    expect(result).toContain('Details:');
  });

  test('returns formatted message for file not found errors', () => {
    const error = 'no such file or directory: /path/to/file';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('File or directory not found');
    expect(result).toContain('Check that paths are correct');
  });

  test('returns formatted message for connection refused errors', () => {
    const error = 'connection refused to host 127.0.0.1';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Connection refused');
    expect(result).toContain('Make sure the service is running');
  });

  test('returns formatted message for timeout errors', () => {
    const error = 'operation timed out after 30 seconds';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('Operation timed out');
    expect(result).toContain('unresponsive');
  });

  test('returns formatted message for SonarQube errors', () => {
    const error = 'sonarqube server returned an error: 401 Unauthorized';
    const result = getUserFriendlyErrorMessage(error);
    
    expect(result).toContain('SonarQube error detected');
    expect(result).toContain('Verify SonarQube server status and configuration');
  });

  test('truncates long error messages appropriately', () => {
    // Create a very long error message with no special pattern
    const longError = 'x'.repeat(300);
    const result = getUserFriendlyErrorMessage(longError);
    
    // Should truncate to 150 chars + ellipsis
    expect(result.length).toBeLessThanOrEqual(153);
    expect(result).toContain('...');
  });

  test('handles long error messages matching patterns correctly', () => {
    // Create a long error message that matches a pattern
    const longSonarQubeError = 'sonarqube ' + 'x'.repeat(300);
    const result = getUserFriendlyErrorMessage(longSonarQubeError);
    
    // Should have the message + truncated details
    expect(result).toContain('SonarQube error detected');
    expect(result).toContain('...');
    expect(result.length).toBeLessThan(longSonarQubeError.length); // Should be truncated
  });
});
