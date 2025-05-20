/**
 * Minimal test file for terminal utilities
 * Testing just one aspect at a time with direct mocking approach
 */

// Direct spies on the original methods
const mockShowToast = jest.fn();
const mockExecAsync = jest.fn();

// Manually mock the execAsync function before importing terminal
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Mock the Raycast API before importing terminal
jest.mock('@raycast/api', () => {
  return {
    showToast: mockShowToast,
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  };
});

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

// Import the module after mocking
import { runCommand } from '../terminal';
import { showToast } from '@raycast/api';

describe('Terminal Utils - Minimal Tests', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Configure mockShowToast to return a toast object
    mockShowToast.mockReset();
    mockShowToast.mockReturnValue({
      style: 'animated',
      title: '',
      message: ''
    });
    
    // Configure mockExecAsync
    mockExecAsync.mockReset();
  });
  
  test('runCommand calls showToast initially', async () => {
    // Configure mockExecAsync to return a successful result
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(showToast).toHaveBeenCalled();
  });
  
  test('runCommand calls execAsync with correct command', async () => {
    // Configure mockExecAsync to return a successful result
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    // Call runCommand
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify execAsync was called with the correct command
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.anything()
    );
  });
  
  test('runCommand handles environment options', async () => {
    // Configure mockExecAsync to return a successful result
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: ''
    });
    
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Call runCommand with options
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with the correct options
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'custom-value'
        })
      })
    );
  });
});
