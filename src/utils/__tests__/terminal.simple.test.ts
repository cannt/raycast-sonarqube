/**
 * Simple test file for terminal utilities - focusing only on getUserFriendlyErrorMessage
 */
import { getUserFriendlyErrorMessage } from '../terminal';

// Mock the raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockReturnValue({
    style: null,
    title: null,
    message: null
  }),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync
jest.mock('util', () => ({
  promisify: jest.fn().mockReturnValue(jest.fn())
}));

describe('Terminal utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getUserFriendlyErrorMessage', () => {
    it('returns friendly message for command not found error', () => {
      const error = 'bash: sonar-scanner: command not found';
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('Command not found');
      expect(result).toContain('Make sure all required tools are installed');
      expect(result).toContain(error);
    });

    it('returns friendly message for permission denied error', () => {
      const error = 'permission denied: /usr/local/bin/sonar-scanner';
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('Permission denied');
      expect(result).toContain('higher privileges');
      expect(result).toContain(error);
    });

    it('returns friendly message for SonarQube error', () => {
      const error = 'Error connecting to SonarQube server';
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('SonarQube error detected');
      expect(result).toContain('Verify SonarQube server');
      expect(result).toContain(error);
    });

    it('truncates long error messages', () => {
      const error = 'A'.repeat(200);
      const result = getUserFriendlyErrorMessage(error);
      // Expect the error to be truncated according to implementation
      expect(result.length).toBeLessThan(error.length);
      // Allow for details prefix/suffix in the implementation
      expect(result.length).toBeLessThanOrEqual(error.length); // Should be truncated but might include details text
    });
  });
  
  // Focusing only on getUserFriendlyErrorMessage to get stable tests first
});
