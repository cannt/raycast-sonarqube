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
import { mockGetItem, mockSetItem } from "./mocks/storageMocks";
import { mockExecAsync } from "./mocks/terminalMocks";
import { mockIsSonarQubeRunning } from "./mocks/sonarQubeMocks";

// Create mock toast tracking object for tests
export const mockToast = {
  style: null as string | null,
  title: null as string | null,
  message: null as string | null,
  hide: jest.fn(),
};

// Mock Raycast API
jest.mock("@raycast/api", () => {
  // Create mock functions
  const showToastMock = jest.fn().mockImplementation((props) => {
    mockToast.style = props.style;
    mockToast.title = props.title;
    mockToast.message = props.message || "";
    return mockToast;
  });

  const openExtensionPreferencesMock = jest.fn().mockResolvedValue(undefined);
  const getPreferenceValuesMock = jest.fn().mockReturnValue({
    sonarqubePodmanDir: "/mock/sonarqube/dir",
    sonarqubeAppPath: "",
    sonarqubePort: "9000",
    language: "en",
  });

  // Build the full mock implementation
  return {
    showToast: showToastMock,
    openExtensionPreferences: openExtensionPreferencesMock,
    getPreferenceValues: getPreferenceValuesMock,
    Toast: {
      Style: {
        Success: "success",
        Failure: "failure",
        Animated: "animated",
      },
    },
    Icon: {
      Terminal: "terminal-icon",
      Play: "play-icon",
      Info: "info-icon",
      List: "list-icon",
    },
    List: jest.fn().mockImplementation(({ children }) => children),
    ActionPanel: jest.fn().mockImplementation(({ children }) => children),
    Action: {
      Push: jest.fn(),
      default: jest.fn(),
      OpenInBrowser: jest.fn(),
      SubmitForm: jest.fn(),
      CopyToClipboard: jest.fn(),
    },
    LocalStorage: {
      getItem: mockGetItem,
      setItem: mockSetItem,
      removeItem: jest.fn().mockResolvedValue(undefined),
      clear: jest.fn().mockResolvedValue(undefined),
      allItems: jest.fn().mockResolvedValue({}),
    },
    open: jest.fn().mockResolvedValue(undefined),
    useNavigation: jest.fn().mockReturnValue({
      push: jest.fn(),
      pop: jest.fn(),
    }),
    Form: {
      TextField: jest.fn(),
      DatePicker: jest.fn(),
      Dropdown: jest.fn(),
    },
    confirmAlert: jest.fn().mockResolvedValue(true),
    Keyboard: {
      Shortcut: {
        Enter: "enter",
      },
    },
    // For test verification
    _getMockToast: () => mockToast,
  };
});

// Mock utils module with re-exports
jest.mock("../utils", () => ({
  // Re-export from terminal.ts
  execAsync: mockExecAsync,
  runCommand: jest.fn().mockImplementation(async (command, success, failure) => ({ success: true, message: success })),
  runInNewTerminal: jest
    .fn()
    .mockImplementation(async (commands, success, failure) => ({ success: true, message: success })),
  // Use actual implementation for getUserFriendlyErrorMessage
  getUserFriendlyErrorMessage: jest.requireActual("../utils/terminal").getUserFriendlyErrorMessage,

  // Re-export from sonarQubeStatus.ts
  isSonarQubeRunning: mockIsSonarQubeRunning,
  checkSonarQubeStatus: jest.fn().mockResolvedValue({ status: "up" }),

  // Re-export from projectManagement.ts
  loadProjects: jest.fn().mockResolvedValue([]),
  saveProjects: jest.fn().mockResolvedValue(undefined),
  generateId: jest.fn().mockReturnValue("mock-id"),
  SONARQUBE_PROJECTS_STORAGE_KEY: "sonarqubeProjectsList",
}));

// Mock individual utils modules
jest.mock("../utils/terminal", () => {
  // Get the actual module
  const actualModule = jest.requireActual("../utils/terminal");

  return {
    ...actualModule,
    // Override just what we need to mock
    execAsync: mockExecAsync,
    runCommand: jest
      .fn()
      .mockImplementation(async (command, success, failure) => ({ success: true, message: success })),
    runInNewTerminal: jest
      .fn()
      .mockImplementation(async (commands, success, failure) => ({ success: true, message: success })),
  };
});

jest.mock("../utils/sonarQubeStatus", () => ({
  isSonarQubeRunning: mockIsSonarQubeRunning,
  checkSonarQubeStatus: jest.fn().mockResolvedValue({ status: "up" }),
}));

jest.mock("../utils/projectManagement", () => ({
  loadProjects: jest.fn().mockResolvedValue([]),
  saveProjects: jest.fn().mockResolvedValue(undefined),
  generateId: jest.fn().mockReturnValue("mock-id"),
  SONARQUBE_PROJECTS_STORAGE_KEY: "sonarqubeProjectsList",
}));

// Mock the i18n module
jest.mock("../i18n", () => ({
  __: (key: string, params?: any) => {
    if (params) {
      return `translated:${key}:${JSON.stringify(params)}`;
    }
    return `translated:${key}`;
  },
}));

// Reset all mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
