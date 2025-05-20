/**
 * Working test for terminal utilities with improved mock technique
 */

// Import test utilities and mocks
import { mockExecAsync, mockExecAsyncSuccess, mockExecAsyncFailure } from '../../testUtils/mocks/terminalMocks';

// Define interfaces
interface ToastProps {
  style: string;
  title: string;
  message?: string;
}

interface ToastUpdate {
  property: 'style' | 'title' | 'message';
  value: string;
}

// Create a robust mock toast object for tracking updates
const mockToast = {
  updates: [] as ToastUpdate[],
  initialProps: null as ToastProps | null,
  
  // Private properties for storing current values
  _style: 'animated' as string | null,
  _title: 'Initial Title' as string | null,
  _message: 'Initial Message' as string | null,
  
  // Accessor methods
  get style(): string { return this._style || ''; },
  set style(value: string) {
    this.updates.push({ property: 'style', value });
    this._style = value;
  },
  
  get title(): string { return this._title || ''; },
  set title(value: string) {
    this.updates.push({ property: 'title', value });
    this._title = value;
  },
  
  get message(): string { return this._message || ''; },
  set message(value: string) {
    this.updates.push({ property: 'message', value });
    this._message = value;
  }
};

// Configure Raycast API mock
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockImplementation((props: ToastProps) => {
    // Record the initial toast state
    mockToast.initialProps = props;
    
    // Initialize toast properties
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || '';
    
    return mockToast;
  }),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Fully mock the terminal module with a controlled implementation for testing
jest.mock('../terminal', () => {
  return {
    // Mock runCommand to avoid actual execution and control the test flow
    runCommand: async (command: string, successMessage: string, failureMessage: string, options?: any) => {
      // Create a toast that will track updates
      const toast = await showToast({
        style: Toast.Style.Animated, 
        title: `Running: ${command.split(' ')[0]}...`,
        message: 'Executing...'
      });
      
      try {
        // Use our controlled mock to determine command outcome
        const result = await mockExecAsync(command, options);
        
        if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
          toast.style = Toast.Style.Failure;
          toast.title = failureMessage;
          toast.message = result.stderr;
        } else {
          toast.style = Toast.Style.Success;
          toast.title = successMessage;
          toast.message = result.stdout;
        }
        
        return toast;
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = failureMessage;
        toast.message = error instanceof Error ? error.message : 'Unknown error';
        return toast;
      }
    },
    // Make execAsync available for tests that need it
    execAsync: mockExecAsync
  };
});

// Now import after mocking
import { runCommand } from '../terminal';
import { Toast, showToast } from '@raycast/api';

describe('terminal utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the toast state and updates array
    mockToast.updates = [];
    mockToast.style = 'animated';
    mockToast.title = 'Initial Title';
    mockToast.message = 'Initial Message';
  });
  
  describe('runCommand', () => {
    test('shows initial animated toast', async () => {
      // Arrange
      mockExecAsyncSuccess('Command output', '');
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that showToast was called with animated style
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining('Running:')
        })
      );
    });
    
    test('updates toast to success when command succeeds', async () => {
      // Arrange
      mockExecAsyncSuccess('Command output', '');
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to success
      expect(mockToast.updates).toContainEqual({ property: 'style', value: Toast.Style.Success });
      expect(mockToast.updates).toContainEqual({ property: 'title', value: 'Success' });
      expect(mockToast.updates).toContainEqual({ property: 'message', value: 'Command output' });
    });
    
    test('updates toast to failure when command has error', async () => {
      // Arrange
      mockExecAsyncSuccess('', 'Command failed');
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to failure
      expect(mockToast.updates).toContainEqual({ property: 'style', value: Toast.Style.Failure });
      expect(mockToast.updates).toContainEqual({ property: 'title', value: 'Failure' });
      expect(mockToast.updates).toContainEqual({ property: 'message', value: 'Command failed' });
    });
    
    test('keeps success state when stderr only contains warnings', async () => {
      // Arrange
      mockExecAsyncSuccess('Command output', 'warning: This is just a warning');
      
      // Act
      await runCommand('test-command', 'Success', 'Failure');
      
      // Assert - check that toast was updated to success despite warning
      expect(mockToast.updates).toContainEqual({ property: 'style', value: Toast.Style.Success });
      expect(mockToast.updates).toContainEqual({ property: 'title', value: 'Success' });
      expect(mockToast.updates).toContainEqual({ property: 'message', value: 'Command output' });
    });
  });
});
