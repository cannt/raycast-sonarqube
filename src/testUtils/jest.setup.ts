/**
 * Jest setup file that configures global mocks and test environment
 * This file is referenced in jest.config.js
 */

import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for TextEncoder and TextDecoder which are needed by some dependencies
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Import mocks
import { mockGetItem, mockSetItem } from './mocks/storageMocks';
import { mockExecAsync } from './mocks/terminalMocks';
import { mockIsSonarQubeRunning } from './mocks/sonarQubeMocks';

// Mock Raycast API
jest.mock('@raycast/api', () => ({
  showToast: jest.fn().mockResolvedValue({ hide: jest.fn() }),
  openExtensionPreferences: jest.fn().mockResolvedValue(undefined),
  getPreferenceValues: jest.fn().mockReturnValue({
    sonarqubePodmanDir: '/mock/sonarqube/dir',
    useCustomSonarQubeApp: false,
    sonarqubeAppPath: '',
    language: 'en',
  }),
  Toast: {
    Style: {
      Success: "success",
      Failure: "failure",
      Animated: "animated"
    }
  },
  Icon: {
    Terminal: "terminal-icon",
    Play: "play-icon",
    Info: "info-icon",
    List: "list-icon"
  },
  List: jest.fn().mockImplementation(({ children }) => children),
  ActionPanel: jest.fn().mockImplementation(({ children }) => children),
  Action: {
    Push: jest.fn(),
    default: jest.fn()
  },
  LocalStorage: {
    getItem: mockGetItem,
    setItem: mockSetItem,
  },
  open: jest.fn().mockResolvedValue(undefined),
}));

// Mock utils module with re-exports
jest.mock('../utils', () => ({
  // Re-export from terminal.ts
  execAsync: mockExecAsync,
  runCommand: jest.fn().mockImplementation(
    async (command, success, failure) => ({ success: true, message: success })
  ),
  runInNewTerminal: jest.fn().mockImplementation(
    async (commands, success, failure) => ({ success: true, message: success })
  ),
  getUserFriendlyErrorMessage: jest.fn().mockImplementation(
    (errorMsg) => `Friendly: ${errorMsg}`
  ),
  
  // Re-export from sonarQubeStatus.ts
  isSonarQubeRunning: mockIsSonarQubeRunning,
  checkSonarQubeStatus: jest.fn().mockResolvedValue({ status: 'up' }),
  
  // Re-export from projectManagement.ts
  loadProjects: jest.fn().mockResolvedValue([]),
  saveProjects: jest.fn().mockResolvedValue(undefined),
  generateId: jest.fn().mockReturnValue('mock-id'),
  SONARQUBE_PROJECTS_STORAGE_KEY: 'sonarqubeProjectsList',
}));

// Mock individual utils modules
jest.mock('../utils/terminal', () => ({
  execAsync: mockExecAsync,
  runCommand: jest.fn().mockImplementation(
    async (command, success, failure) => ({ success: true, message: success })
  ),
  runInNewTerminal: jest.fn().mockImplementation(
    async (commands, success, failure) => ({ success: true, message: success })
  ),
  getUserFriendlyErrorMessage: jest.fn().mockImplementation(
    (errorMsg) => `Friendly: ${errorMsg}`
  ),
}));

jest.mock('../utils/sonarQubeStatus', () => ({
  isSonarQubeRunning: mockIsSonarQubeRunning,
  checkSonarQubeStatus: jest.fn().mockResolvedValue({ status: 'up' }),
}));

jest.mock('../utils/projectManagement', () => ({
  loadProjects: jest.fn().mockResolvedValue([]),
  saveProjects: jest.fn().mockResolvedValue(undefined),
  generateId: jest.fn().mockReturnValue('mock-id'),
  SONARQUBE_PROJECTS_STORAGE_KEY: 'sonarqubeProjectsList',
}));

// Mock the i18n module
jest.mock('../i18n', () => ({
  __: (key: string, params?: any) => {
    if (params) {
      return `translated:${key}:${JSON.stringify(params)}`;
    }
    return `translated:${key}`;
  }
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
