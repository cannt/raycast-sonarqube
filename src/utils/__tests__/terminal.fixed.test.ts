/**
 * Fixed test for terminal.ts utilities
 */

// Mock execAsync before importing terminal.ts
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Create a class to track toast updates
class ToastTracker {
  public style: string = 'animated';
  public title: string = 'Initial Title';
  public message: string | undefined = 'Initial Message';
  public updates: {property: string, value: string}[] = [];

  // Reset the tracker
  reset() {
    this.style = 'animated';
    this.title = 'Initial Title';
    this.message = 'Initial Message';
    this.updates = [];
  }

  // Create a toast object with setters that track changes
  createToastObject() {
    return {
      set style(value: string) { 
        toastTracker.style = value; 
        toastTracker.updates.push({property: 'style', value});
      },
      set title(value: string) { 
        toastTracker.title = value; 
        toastTracker.updates.push({property: 'title', value});
      },
      set message(value: string) { 
        toastTracker.message = value; 
        toastTracker.updates.push({property: 'message', value});
      }
    };
  }
}

// Create a single tracker instance
const toastTracker = new ToastTracker();

// Mock the Raycast API
const mockShowToast = jest.fn().mockImplementation((props) => {
  // Set initial values
  toastTracker.style = props.style;
  toastTracker.title = props.title;
  toastTracker.message = props.message;
  
  // Return mock toast object that will track updates
  return toastTracker.createToastObject();
});

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

// Import our module after mocking
import { runCommand } from '../terminal';
import { Toast } from '@raycast/api';

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Terminal Utilities', () => {
  beforeEach(() => {
    // Reset mock calls and toast state before each test
    jest.clearAllMocks();
    mockExecAsync.mockReset();
    toastTracker.reset();
  });
  
  test('runCommand shows success toast when command succeeds', async () => {
    // Mock successful command
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success output',
      stderr: ''
    });
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated correctly
    // Find the style update in the tracked updates
    const styleUpdate = toastTracker.updates.find(u => u.property === 'style' && u.value === Toast.Style.Success);
    expect(styleUpdate).toBeDefined();
    
    // Final state should be success
    expect(toastTracker.style).toBe(Toast.Style.Success);
    expect(toastTracker.title).toBe('Success Message');
    expect(toastTracker.message).toContain('Success output');
    
    // Verify execAsync was called with the right command
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        env: expect.anything()
      })
    );
  });
  
  test('runCommand shows failure toast when stderr is not a warning', async () => {
    // Mock command with error
    mockExecAsync.mockResolvedValueOnce({
      stdout: '',
      stderr: 'Error: Command failed'
    });
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated to failure
    const styleUpdate = toastTracker.updates.find(u => u.property === 'style' && u.value === Toast.Style.Failure);
    expect(styleUpdate).toBeDefined();
    
    // Final state should be failure
    expect(toastTracker.style).toBe(Toast.Style.Failure);
    expect(toastTracker.title).toBe('Failure Message');
    expect(toastTracker.message).toContain('failed');
  });
  
  test('runCommand treats stderr warnings as success', async () => {
    // Mock command with warning
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Command succeeded with warnings',
      stderr: 'warning: This is just a warning'
    });
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Even with warning, it should show success
    const styleUpdate = toastTracker.updates.find(u => u.property === 'style' && u.value === Toast.Style.Success);
    expect(styleUpdate).toBeDefined();
    
    // Final state should be success
    expect(toastTracker.style).toBe(Toast.Style.Success);
    expect(toastTracker.title).toBe('Success Message');
  });
  
  test('runCommand handles thrown errors', async () => {
    // Mock execAsync to throw an error
    mockExecAsync.mockRejectedValueOnce(new Error('Command execution failed'));
    
    // Run the command
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast shows failure
    const styleUpdate = toastTracker.updates.find(u => u.property === 'style' && u.value === Toast.Style.Failure);
    expect(styleUpdate).toBeDefined();
    
    // Final state should be failure
    expect(toastTracker.style).toBe(Toast.Style.Failure);
    expect(toastTracker.title).toBe('Failure Message');
  });
  
  test('runCommand passes environment options correctly', async () => {
    // Reset the mock
    mockExecAsync.mockReset();
    
    // Mock successful command execution
    mockExecAsync.mockResolvedValueOnce({
      stdout: 'Success with options',
      stderr: ''
    });
    
    // Call with custom options
    const options = { 
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'value' }
    };
    
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify the custom options were passed correctly
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'value',
          PATH: expect.any(String)
        })
      })
    );
  });
});
