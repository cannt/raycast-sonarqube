/**
 * Basic working test for terminal utilities
 */

// Mock the Raycast API
jest.mock('@raycast/api', () => {
  // Create tracking object for showToast call verification
  const mockToast = {
    style: null,
    title: null,
    message: null
  };
  
  // Mock showToast to return a mockable object
  const showToastMock = jest.fn().mockImplementation((props) => {
    // Set initial values
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || '';
    
    // Return an object with property setters that update the mock
    return {
      set style(value) { mockToast.style = value; },
      set title(value) { mockToast.title = value; },
      set message(value) { mockToast.message = value; }
    };
  });
  
  return {
    showToast: showToastMock,
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    },
    // Export for test verification
    _getMockToast: () => mockToast
  };
});

// Mock execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import after mocking
import { runCommand } from '../terminal';
import { showToast, Toast, _getMockToast } from '@raycast/api';

describe('terminal utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('runCommand', () => {
    test('shows animated toast initially', async () => {
      // Setup mock to return success
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify showToast was called with correct initial params
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: 'animated',
          title: expect.stringContaining('Running:')
        })
      );
    });
    
    test('updates toast to success on successful command', async () => {
      // Setup mock to return success
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast state was updated to success
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe('success');
      expect(finalToastState.title).toBe('Success');
      expect(finalToastState.message).toContain('Command output');
    });
    
    test('updates toast to failure when command has stderr', async () => {
      // Setup mock to return error
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command error'
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast state was updated to failure
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe('failure');
      expect(finalToastState.title).toBe('Failure');
      expect(finalToastState.message).toContain('Command error');
    });
    
    test('shows success when stderr only contains warnings', async () => {
      // Setup mock to return warning
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning'
      });
      
      // Call runCommand
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast state was updated to success despite warning
      const finalToastState = _getMockToast();
      expect(finalToastState.style).toBe('success');
      expect(finalToastState.title).toBe('Success');
    });
  });
});
