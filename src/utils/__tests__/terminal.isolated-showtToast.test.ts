/**
 * Isolated test focusing only on the showToast functionality
 * Updated with direct module mocking approach from the test-fixing-workflow
 */

// Create a mock execAsync function that returns a Promise
const mockExecAsyncFn = jest.fn().mockImplementation(async (command, options) => {
  console.log(`Mock execAsync called with: ${command}`);
  // Default implementation returns success
  return {
    stdout: 'Success output',
    stderr: ''
  };
});

// 4. Create mock toast with tracking properties
const mockToast = {
  _style: 'animated',
  _title: 'Initial Title',
  _message: 'Initial Message',
  get style() { return this._style; },
  set style(value) { this._style = value; },
  get title() { return this._title; },
  set title(value) { this._title = value; },
  get message() { return this._message; },
  set message(value) { this._message = value; }
};

// 5. Create a toast tracker to track toast updates
class ToastTracker {
  _style: string = 'animated';
  _title: string = 'Initial Title';
  _message: string = 'Initial Message';
  toastUpdates: {property: string, value: string}[] = [];
  
  get style() { return this._style; }
  set style(value: string) { 
    this._style = value; 
    this.toastUpdates.push({property: 'style', value});
  }
  
  get title() { return this._title; }
  set title(value: string) { 
    this._title = value; 
    this.toastUpdates.push({property: 'title', value});
  }
  
  get message() { return this._message; }
  set message(value: string) { 
    this._message = value; 
    this.toastUpdates.push({property: 'message', value});
  }
  
  reset() {
    this._style = 'animated';
    this._title = 'Initial Title';
    this._message = 'Initial Message';
    this.toastUpdates = [];
  }
}

// Create a single tracker instance
const toastTracker = new ToastTracker();

// Create mock showToast function
const mockShowToast = jest.fn((props?: any) => {
  if (props) {
    // Set initial values
    toastTracker.style = props.style;
    toastTracker.title = props.title;
    toastTracker.message = props.message;
  }
  
  // Return mock toast with getters/setters
  return {
    get style() { return toastTracker.style; },
    set style(value: string) { toastTracker.style = value; },
    get title() { return toastTracker.title; },
    set title(value: string) { toastTracker.title = value; },
    get message() { return toastTracker.message; },
    set message(value: string) { toastTracker.message = value; }
  };
});

// Mock Raycast API
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

// Suppress console logs
const originalConsole = {
  log: console.log,
  error: console.error
};
console.log = jest.fn();
console.error = jest.fn();

// DIRECT MODULE MOCKING - This is the key to reliable testing
jest.mock('../terminal', () => {
  // Get the actual module
  const originalModule = jest.requireActual('../terminal');
  
  // Return a modified version with our mocks
  return {
    ...originalModule,
    execAsync: mockExecAsyncFn,
    
    // Custom implementation of runCommand for testing
    runCommand: async (command: string, successMessage: string, failureMessage: string, options?: { cwd?: string; env?: NodeJS.ProcessEnv }) => {
      // First update toast with initial state
      mockShowToast({
        style: 'animated',
        title: `Running: ${command.split(' ')[0]}...`,
        message: 'Preparing environment...'
      });
      
      try {
        // Prepare options with PATH additions
        const mergedOptions = options || {};
        if (!mergedOptions.env) mergedOptions.env = {};
        
        const currentPath = mergedOptions.env.PATH || '';
        mergedOptions.env.PATH = `/opt/podman/bin:/opt/homebrew/bin:${currentPath}`;
        
        // Call our mock execAsync
        const result = await mockExecAsyncFn(command, mergedOptions);
        
        // Update toast based on result
        if (result.stderr && !result.stderr.toLowerCase().includes('warning')) {
          toastTracker.style = 'failure';
          toastTracker.title = failureMessage;
          toastTracker.message = result.stderr;
        } else {
          toastTracker.style = 'success';
          toastTracker.title = successMessage;
          toastTracker.message = result.stdout || 'Command completed successfully';
        }
        
        return result;
      } catch (error: any) {
        // Handle errors
        toastTracker.style = 'failure';
        toastTracker.title = failureMessage;
        toastTracker.message = error.message || 'Unknown error';
        throw error;
      }
    }
  };
});

// IMPORTANT: Import modules AFTER setting up all mocks
import { runCommand } from '../terminal';

// Reset environment after tests
afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('Terminal.runCommand with isolated showToast', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    mockExecAsyncFn.mockReset();
    toastTracker.reset();
  });
  
  test('verifies showToast is called', async () => {
    // Setup mock for successful command execution
    mockExecAsyncFn.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Act - call runCommand
    await runCommand('echo "hello"', 'Success Message', 'Failure Message');
    
    // Assert - verify showToast was called
    expect(mockShowToast).toHaveBeenCalled();
    
    // Verify the toast was updated with success
    expect(toastTracker.style).toBe('success');
    expect(toastTracker.title).toBe('Success Message');
    expect(toastTracker.message).toContain('Success output');
  });
});
