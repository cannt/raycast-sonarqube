import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// Polyfill for TextEncoder and TextDecoder which are needed by some dependencies
global.TextEncoder = TextEncoder;
// @ts-ignore
global.TextDecoder = TextDecoder;

// Mock the Raycast API
jest.mock("@raycast/api", () => ({
  showToast: jest.fn().mockResolvedValue({ hide: jest.fn() }),
  openExtensionPreferences: jest.fn().mockResolvedValue(undefined),
  getPreferenceValues: jest.fn().mockReturnValue({}),
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
  }
}));

// Mock the utils module
jest.mock("../utils", () => ({
  isSonarQubeRunning: jest.fn(),
  runInNewTerminal: jest.fn().mockResolvedValue(undefined),
  loadProjects: jest.fn().mockResolvedValue([])
}));

// Mock the i18n module
jest.mock("../i18n", () => ({
  __: (key: string, params?: any) => {
    if (params) {
      return `translated:${key}:${JSON.stringify(params)}`;
    }
    return `translated:${key}`;
  }
}));
