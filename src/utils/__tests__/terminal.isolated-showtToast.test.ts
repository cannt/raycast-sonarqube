/**
 * Isolated test focusing only on the showToast functionality
 * Following the test-fixing workflow from memories
 */

// Mock setup - directly mock the specific functions
const mockExec = jest.fn((_command, _options, callback) => {
  // Simulate successful exec call
  callback(null, { stdout: 'Success output', stderr: '' });
  return { kill: jest.fn() };
});

jest.mock('child_process', () => ({
  exec: mockExec
}));

const mockShowToast = jest.fn(() => {
  // Return a toast object with getters and setters for tracking
  const toast = {
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
  
  return toast;
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

// Suppress console logs
const originalConsole = {
  log: console.log,
  error: console.error
};
console.log = jest.fn();
console.error = jest.fn();

// Import after mocks are set up
import { runCommand } from '../terminal';
import { showToast } from '@raycast/api';

// Reset environment after tests
afterAll(() => {
  console.log = originalConsole.log;
  console.error = originalConsole.error;
});

describe('Terminal.runCommand with isolated showToast', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  test('verifies showToast is called', async () => {
    // Arrange - update mockExec to return success
    mockExec.mockImplementation((_command, _options, callback) => {
      callback(null, { stdout: 'Success output', stderr: '' });
      return { kill: jest.fn() };
    });
    
    // Act - call runCommand
    await runCommand('echo "hello"', 'Success Message', 'Failure Message');
    
    // Assert - verify showToast was called
    expect(mockShowToast).toHaveBeenCalled();
  });
});
