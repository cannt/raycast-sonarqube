/**
 * Test file specifically for the runCommand terminal utility
 */

// We need to mock the dependencies before importing the module under test

// Create a mock for execAsync
const mockExecAsync = jest.fn();

// Mock the terminal.ts module to use our mock execAsync
jest.mock('../terminal', () => {
  const originalModule = jest.requireActual('../terminal');
  
  // Replace only execAsync with our mock
  return {
    ...originalModule,
    execAsync: mockExecAsync
  };
});

// Create a toast tracker to record toast state changes
class ToastTracker {
  public style: string = 'animated';
  public title: string = '';
  public message: string = '';
  public toastUpdates: {property: string, value: string}[] = [];
  
  createToastObject() {
    return {
      set style(value: string) { 
        toastTracker.style = value; 
        toastTracker.toastUpdates.push({property: 'style', value});
      },
      set title(value: string) { 
        toastTracker.title = value; 
        toastTracker.toastUpdates.push({property: 'title', value});
      },
      set message(value: string) { 
        toastTracker.message = value; 
        toastTracker.toastUpdates.push({property: 'message', value});
      }
    };
  }
  
  reset() {
    this.style = 'animated';
    this.title = '';
    this.message = '';
    this.toastUpdates = [];
  }
}

const toastTracker = new ToastTracker();
const mockShowToast = jest.fn().mockImplementation((props: any) => {
  // Set initial values
  toastTracker.style = props.style;
  toastTracker.title = props.title;
  toastTracker.message = props.message || '';
  
  // Return a toast object that will track updates
  return toastTracker.createToastObject();
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

// Now we can import the function to test after mocks are set up
import { runCommand } from '../terminal';

// Suppress console output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal runCommand utility', () => {
  beforeAll(() => {
    console.log = jest.fn();
    console.error = jest.fn();
  });

  afterAll(() => {
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    toastTracker.reset();
  });
  
  test('showToast is called with animated style initially', async () => {
    // Setup mock for execAsync to not actually run
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: ''
    });
    
    await runCommand('test-command', 'Success', 'Failure');
    
    // Verify showToast was called
    expect(mockShowToast).toHaveBeenCalled();
    
    // Check that initial toast had animated style
    expect(toastTracker.style).toBe('animated');
    expect(toastTracker.title).toContain('Running:');
  });
  
  test('successful command shows success toast', async () => {
    // Setup mock for successful command execution
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command succeeded',
      stderr: ''
    });

    await runCommand('test-command', 'Success', 'Failure');
    
    // Check that toast was updated to show success
    const successStyleUpdate = toastTracker.toastUpdates.find(u => u.property === 'style' && u.value === 'success');
    expect(successStyleUpdate).toBeDefined();
    
    // Final toast state should be success
    expect(toastTracker.style).toBe('success');
    expect(toastTracker.title).toBe('Success');
    expect(toastTracker.message).toContain('Command succeeded');
  });
  
  test('command with stderr shows failure toast', async () => {
    // Setup mock for command with error output
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Command failed with an error'
    });

    await runCommand('test-command', 'Success', 'Failure');
    
    // Check that toast was updated to show failure
    const failureStyleUpdate = toastTracker.toastUpdates.find(u => u.property === 'style' && u.value === 'failure');
    expect(failureStyleUpdate).toBeDefined();
    
    // Final toast state should be failure
    expect(toastTracker.style).toBe('failure');
    expect(toastTracker.title).toBe('Failure');
    expect(toastTracker.message).toContain('Command failed with an error');
  });
  
  test('command with warning in stderr still shows success', async () => {
    // Setup mock for command with warning in stderr
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command output',
      stderr: 'warning: This is just a warning message'
    });

    await runCommand('test-command', 'Success', 'Failure');
    
    // Warnings shouldn't trigger failure
    const successStyleUpdate = toastTracker.toastUpdates.find(u => u.property === 'style' && u.value === 'success');
    expect(successStyleUpdate).toBeDefined();
    
    // Final toast state should be success
    expect(toastTracker.style).toBe('success');
    expect(toastTracker.title).toBe('Success');
  });
  
  test('exception during command execution shows failure toast', async () => {
    // Setup mock to throw an error
    mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));

    await runCommand('test-command', 'Success', 'Failure');
    
    // Check that toast was updated to show failure
    const failureStyleUpdate = toastTracker.toastUpdates.find(u => u.property === 'style' && u.value === 'failure');
    expect(failureStyleUpdate).toBeDefined();
    
    // Final toast state should be failure
    expect(toastTracker.style).toBe('failure');
    expect(toastTracker.title).toBe('Failure');
    expect(toastTracker.message).toContain('Command execution failed');
  });
  
  test('environment options are properly passed', async () => {
    // Setup mock for successful command
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: ''
    });

    // Call with custom options
    const options = { 
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'value' }
    };
    
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with the right options
    expect(mockExecAsync).toHaveBeenCalled();
    const callArgs = mockExecAsync.mock.calls[0];
    
    // First arg should be the command
    expect(callArgs[0]).toBe('test-command');
    
    // Second arg should include our options
    expect(callArgs[1].cwd).toBe('/custom/path');
    expect(callArgs[1].env.CUSTOM_VAR).toBe('value');
    
    // Should have PATH augmented
    expect(callArgs[1].env.PATH).toBeTruthy();
  });
});
