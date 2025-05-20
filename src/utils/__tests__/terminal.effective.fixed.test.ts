/**
 * Terminal utilities test with proper module isolation
 */

// 1. First, mock the dependencies at the module boundary
const mockExecOutput = {
  stdout: '',
  stderr: ''
};

const mockExecAsync = jest.fn().mockResolvedValue(mockExecOutput);

// Mock child_process and util
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// 2. Create a mockToast with the needed properties
const mockToast = {
  style: 'animated',
  title: '',
  message: ''
};

// 3. Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn(() => mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// 4. Only import after all mocks are set up
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// 5. Suppress console logs for cleaner test output
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Terminal utilities (fixed tests)', () => {
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
    mockToast.style = 'animated';
    mockToast.title = '';
    mockToast.message = '';
    mockExecOutput.stdout = '';
    mockExecOutput.stderr = '';
  });
  
  test('runCommand calls execAsync with correct parameters', async () => {
    // Setup
    mockExecAsync.mockImplementationOnce(() => Promise.resolve({
      stdout: 'Command output',
      stderr: ''
    }));
    
    // Execute
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
    // Setup
    mockExecAsync.mockImplementationOnce(() => Promise.resolve({
      stdout: 'Command succeeded',
      stderr: ''
    }));
    
    // Execute
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe(Toast.Style.Success);
    expect(mockToast.title).toBe('Success Message');
  });
  
  test('runCommand updates toast on failure', async () => {
    // Setup
    mockExecAsync.mockImplementationOnce(() => Promise.resolve({
      stdout: '',
      stderr: 'Command failed'
    }));
    
    // Execute
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Failure Message');
  });
  
  test('runCommand handles exceptions', async () => {
    // Setup
    mockExecAsync.mockImplementationOnce(() => Promise.reject(new Error('Execution error')));
    
    // Execute
    await runCommand('test-command', 'Success Message', 'Failure Message');
    
    // Verify toast was updated
    expect(mockToast.style).toBe(Toast.Style.Failure);
    expect(mockToast.title).toBe('Failure Message');
    expect(mockToast.message).toContain('Execution error');
  });
  
  test('runCommand passes environment options correctly', async () => {
    // Setup
    mockExecAsync.mockImplementationOnce(() => Promise.resolve({
      stdout: 'Command succeeded',
      stderr: ''
    }));
    
    // Custom options
    const options = {
      cwd: '/custom/path',
      env: { CUSTOM_VAR: 'custom-value' }
    };
    
    // Execute
    await runCommand('test-command', 'Success', 'Failure', options);
    
    // Verify execAsync was called with correct parameters
    expect(mockExecAsync).toHaveBeenCalledWith(
      'test-command',
      expect.objectContaining({
        cwd: '/custom/path',
        env: expect.objectContaining({
          CUSTOM_VAR: 'custom-value',
          PATH: expect.stringContaining('/opt/homebrew/bin')
        })
      })
    );
  });
});
