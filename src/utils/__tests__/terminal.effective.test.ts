/**
 * Simple, effective test for runCommand that properly mocks all dependencies
 */

// Mocks need to be defined before importing the modules they mock
jest.mock('@raycast/api');
jest.mock('util');
jest.mock('child_process');

// Create our mocks before importing any modules
const mockExecAsync = jest.fn();
const mockToastObject = {
  style: 'animated',
  title: 'Test Title',
  message: 'Test Message'
};

// Configure the mocks with proper typing
const mockPromisify = jest.fn().mockReturnValue(mockExecAsync);
const mockShowToast = jest.fn().mockReturnValue(mockToastObject);

// Setup the mock implementations
jest.mock('@raycast/api', () => ({
  showToast: mockShowToast,
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

jest.mock('util', () => ({
  promisify: mockPromisify
}));

// Import after mocking
import { showToast, Toast } from '@raycast/api';

// Now we can import the terminal module
import { runCommand } from '../terminal';

describe('terminal utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset toast state
    mockToastObject.style = 'animated';
    mockToastObject.title = 'Test Title';
    mockToastObject.message = 'Test Message';
  });
  
  test('runCommand calls execAsync with correct parameters', async () => {
    // Setup mock success response
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify execAsync was called correctly
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        env: expect.objectContaining({
          PATH: expect.stringContaining('/opt')
        })
      })
    );
  });
  
  test('runCommand updates toast on success', async () => {
    // Setup mock success response
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToastObject.style).toBe(Toast.Style.Success);
    expect(mockToastObject.title).toBe('Success Message');
  });
  
  test('runCommand updates toast on failure', async () => {
    // Setup mock error response
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Error output'
    });
    
    // Call the function
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToastObject.style).toBe(Toast.Style.Failure);
    expect(mockToastObject.title).toBe('Failure Message');
  });
});
