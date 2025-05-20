/**
 * Clean implementation of tests for terminal utilities
 */

// Define interfaces for our mock objects
interface ToastProps {
  style: string;
  title: string;
  message?: string;
}

interface ToastUpdate {
  property: 'style' | 'title' | 'message';
  value: string;
}

// Create a mock toast for tracking updates
const mockToast = {
  updates: [] as ToastUpdate[],
  set style(value: string) {
    this.updates.push({ property: 'style', value });
  },
  set title(value: string) {
    this.updates.push({ property: 'title', value });
  },
  set message(value: string) {
    this.updates.push({ property: 'message', value });
  }
};

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockImplementation((props: ToastProps) => mockToast),
  Toast: {
    Style: {
      Animated: 'animated',
      Success: 'success',
      Failure: 'failure'
    }
  }
}));

// Mock execAsync
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Import after mocking
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Terminal Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToast.updates = [];
  });
  
  describe('runCommand', () => {
    test('shows animated toast initially', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });
      
      // Execute
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify initial toast
      expect(showToast).toHaveBeenCalledWith(
        expect.objectContaining({
          style: Toast.Style.Animated,
          title: expect.stringContaining('Running:')
        })
      );
    });
    
    test('updates toast to success when command succeeds', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Execute
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast was updated to success
      const styleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'style' && u.value === Toast.Style.Success
      );
      const titleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'title' && u.value === 'Success'
      );
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('updates toast to failure when command has stderr', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command error'
      });
      
      // Execute
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast was updated to failure
      const styleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'style' && u.value === Toast.Style.Failure
      );
      const titleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'title' && u.value === 'Failure'
      );
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('treats warnings in stderr as success', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning'
      });
      
      // Execute
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast was updated to success despite warning
      const styleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'style' && u.value === Toast.Style.Success
      );
      const titleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'title' && u.value === 'Success'
      );
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('handles exceptions with failure toast', async () => {
      // Setup
      mockExecAsync.mockRejectedValueOnce(new Error('Execution failed'));
      
      // Execute
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify toast was updated to failure
      const styleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'style' && u.value === Toast.Style.Failure
      );
      const titleUpdate = mockToast.updates.find(
        (u: ToastUpdate) => u.property === 'title' && u.value === 'Failure'
      );
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('passes environment options correctly', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Success with options',
        stderr: ''
      });
      
      // Custom options
      const options = {
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      // Execute with options
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Verify execAsync was called with correct arguments
      expect(mockExecAsync).toHaveBeenCalled();
      const callArgs = mockExecAsync.mock.calls[0];
      
      // Command
      expect(callArgs[0]).toBe('test-command');
      
      // Options
      expect(callArgs[1].cwd).toBe('/custom/path');
      expect(callArgs[1].env.CUSTOM_VAR).toBe('value');
      expect(callArgs[1].env.PATH).toBeTruthy();
    });
  });
});
