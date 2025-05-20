/**
 * Final simplified approach to testing terminal utilities
 */

// Mock the execAsync function
const mockExecAsync = jest.fn();
jest.mock('util', () => ({
  promisify: jest.fn(() => mockExecAsync)
}));

// Define interfaces for our testing utilities
interface ToastProps {
  style: string;
  title: string;
  message?: string;
}

interface ToastUpdate {
  type: 'style' | 'title' | 'message';
  value: string;
}

// Track toast state for verification
let lastToastProps: ToastProps | null = null;
let toastUpdates: ToastUpdate[] = [];

// Mock Raycast API
jest.mock('@raycast/api', () => {
  return {
    showToast: jest.fn().mockImplementation((props) => {
      // Track initial props
      lastToastProps = { ...props };
      
      // Return a mock toast object
      return {
        set style(value: string) {
          toastUpdates.push({ type: 'style', value });
        },
        set title(value: string) {
          toastUpdates.push({ type: 'title', value });
        },
        set message(value: string) {
          toastUpdates.push({ type: 'message', value });
        }
      };
    }),
    Toast: {
      Style: {
        Animated: 'animated',
        Success: 'success',
        Failure: 'failure'
      }
    }
  };
});

// Import after mocking
import { runCommand } from '../terminal';
import { showToast, Toast } from '@raycast/api';

// Suppress console output during tests
jest.spyOn(console, 'log').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

describe('Terminal Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    lastToastProps = null;
    toastUpdates = [];
  });
  
  describe('runCommand', () => {
    test('shows animated toast with running message initially', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({ stdout: '', stderr: '' });
      
      // Run the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Verify initial toast properties
      expect(showToast).toHaveBeenCalled();
      expect(lastToastProps).not.toBeNull();
      expect(lastToastProps?.style).toBe(Toast.Style.Animated);
      expect(lastToastProps?.title).toContain('Running:');
    });
    
    test('updates toast to success when command succeeds', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: ''
      });
      
      // Run the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find success style update
      const styleUpdate = toastUpdates.find((u: ToastUpdate) => u.type === 'style' && u.value === Toast.Style.Success);
      const titleUpdate = toastUpdates.find((u: ToastUpdate) => u.type === 'title' && u.value === 'Success');
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('updates toast to failure when command has stderr', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: '',
        stderr: 'Command error'
      });
      
      // Run the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find failure style update
      const styleUpdate = toastUpdates.find(u => u.type === 'style' && u.value === Toast.Style.Failure);
      const titleUpdate = toastUpdates.find(u => u.type === 'title' && u.value === 'Failure');
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('shows success when stderr only contains warnings', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output',
        stderr: 'warning: This is just a warning'
      });
      
      // Run the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find success style update (despite warning in stderr)
      const styleUpdate = toastUpdates.find((u: ToastUpdate) => u.type === 'style' && u.value === Toast.Style.Success);
      const titleUpdate = toastUpdates.find((u: ToastUpdate) => u.type === 'title' && u.value === 'Success');
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('handles thrown errors', async () => {
      // Setup a rejected promise
      mockExecAsync.mockRejectedValueOnce(new Error('Execution failed'));
      
      // Run the command
      await runCommand('test-command', 'Success', 'Failure');
      
      // Find failure style update
      const styleUpdate = toastUpdates.find(u => u.type === 'style' && u.value === Toast.Style.Failure);
      const titleUpdate = toastUpdates.find(u => u.type === 'title' && u.value === 'Failure');
      
      expect(styleUpdate).toBeDefined();
      expect(titleUpdate).toBeDefined();
    });
    
    test('passes environment options correctly', async () => {
      // Setup
      mockExecAsync.mockResolvedValueOnce({
        stdout: 'Command output with options',
        stderr: ''
      });
      
      // Custom options to test
      const options = {
        cwd: '/custom/path',
        env: { CUSTOM_VAR: 'value' }
      };
      
      // Run with options
      await runCommand('test-command', 'Success', 'Failure', options);
      
      // Check execAsync was called with correct options
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
});
