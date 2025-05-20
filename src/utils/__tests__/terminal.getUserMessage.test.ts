/**
 * Very focused test for the getUserFriendlyErrorMessage function
 */
import { getUserFriendlyErrorMessage } from '../terminal';

describe('getUserFriendlyErrorMessage', () => {
  test('formats command not found error', () => {
    const error = 'bash: sonar-scanner: command not found';
    const result = getUserFriendlyErrorMessage(error);
    
    // Based on the actual implementation, it provides a friendly message
    expect(result).toContain('Command not found');
    expect(result).toContain('Details:');
    expect(result).toContain('bash: sonar-scanner: command not found');
  });
  
  test('formats permission denied error', () => {
    const error = 'permission denied: /usr/local/bin/sonar-scanner';
    const result = getUserFriendlyErrorMessage(error);
    
    // Based on the actual implementation, it provides a friendly message
    expect(result).toContain('Permission denied');
    expect(result).toContain('Details:');
    expect(result).toContain('permission denied');
  });
  
  test('formats SonarQube-specific error', () => {
    const error = 'Failed to connect to SonarQube server at localhost:9000';
    const result = getUserFriendlyErrorMessage(error);
    
    // Based on the actual implementation, it provides a friendly message
    expect(result).toContain('SonarQube error');
    expect(result).toContain('Details:');
    expect(result).toContain('server');
  });
  
  test('formats Podman-specific error', () => {
    const error = 'Error: failed to start podman container';
    const result = getUserFriendlyErrorMessage(error);
    
    // Based on the actual implementation, it provides a friendly message
    expect(result).toContain('Podman error');
    expect(result).toContain('Details:');
    expect(result).toContain('container');
  });
  
  test('handles long error messages', () => {
    const error = 'A'.repeat(200);
    const result = getUserFriendlyErrorMessage(error);
    
    // The implementation should truncate long messages
    expect(result.length).toBeLessThanOrEqual(error.length + 50); // Allow some buffer for prefix text
    expect(result).toContain('...');
    expect(result).toContain('A'); // Should contain at least part of the original error
  });
});
