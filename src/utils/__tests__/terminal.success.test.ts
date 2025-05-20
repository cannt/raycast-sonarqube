/**
 * Working test for terminal utilities
 */
import { Toast } from '@raycast/api';

// Mock the functions we need to test
const mockShowToast = jest.fn();
const mockExecAsync = jest.fn();

// Mock modules
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

// Need to mock execAsync before importing terminal
jest.mock('../terminal', () => {
  // Create mock toast that tracks state
  const mockToast = {
    style: 'animated',
    title: 'Initial Title',
    message: 'Initial Message'
  };
  
  // Mock showToast to return our tracking object
  mockShowToast.mockImplementation((props) => {
    // Set initial values
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || '';
    
    // Return our object so terminal.ts can update it
    return mockToast;
  });
  
  // Mock execAsync
  mockExecAsync.mockImplementation(async (command) => {
    // Default to success response
    return { stdout: 'Success', stderr: '' };
  });
  
  // Get the actual module
  const actualModule = jest.requireActual('../terminal');
  
  // Override execAsync with our mock
  return {
    ...actualModule,
    execAsync: mockExecAsync,
    __mockToast: mockToast // Export for testing
  };
});

// Now import the module under test - after mocking
import { runCommand, __mockToast } from '../terminal';

describe('terminal utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the toast state
    __mockToast.style = 'animated';
    __mockToast.title = 'Initial Title';
    __mockToast.message = 'Initial Message';
  });
  
  describe('runCommand', () => {
    test('shows initial animated toast', async () => {
      // Arrange
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that showToast was called with animated style
      expect(mockShowToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining('Running:')
        })
      );
    });
    
    test('updates toast to success when command succeeds', async () => {
      // Arrange
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to success
      expect(__mockToast.style).toBe(Toast.Style.Success);
      expect(__mockToast.title).toBe('Success');
    });
    
    test('updates toast to failure when command has error', async () => {
      // Arrange
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command failed'
      });
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to failure
      expect(__mockToast.style).toBe(Toast.Style.Failure);
      expect(__mockToast.title).toBe('Failure');
    });
    
    test('keeps success state when stderr only contains warnings', async () => {
      // Arrange
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning'
      });
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to success despite warning
      expect(__mockToast.style).toBe(Toast.Style.Success);
      expect(__mockToast.title).toBe('Success');
    });
  });
});
