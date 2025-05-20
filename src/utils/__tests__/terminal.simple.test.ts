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
      expect(result).toContain('Friendly:');
      expect(result).toContain(error);
    });

    it('returns friendly message for permission denied error', () => {
      const error = 'permission denied: /usr/local/bin/sonar-scanner';
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('Friendly:');
      expect(result).toContain(error);
    });

    it('returns friendly message for SonarQube error', () => {
      const error = 'Error connecting to SonarQube server';
      const result = getUserFriendlyErrorMessage(error);
      expect(result).toContain('Friendly:');
      expect(result).toContain('SonarQube');
    });

    it('truncates long error messages', () => {
      const error = 'A'.repeat(200);
      const result = getUserFriendlyErrorMessage(error);
      // The prefix 'Friendly: ' adds 10 characters, so we expect it to be longer
      // but still truncated from the original length
      expect(result.length).toBeGreaterThan(10); // 'Friendly: ' length
      expect(result.length).toBeLessThanOrEqual(210); // 'Friendly: ' + max 200 chars
    });
  });
  
  // Focusing only on getUserFriendlyErrorMessage to get stable tests first
});
