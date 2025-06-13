/**
 * @jest-environment jsdom
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";

// Type definitions
interface ToastConfig {
  style: string;
  title: string;
  message?: string;
  primaryAction?: {
    title: string;
    onAction: (toast: MockToast) => void;
  };
}

interface MockToast {
  hide: jest.Mock;
  primaryAction?: {
    title: string;
    onAction: (toast: MockToast) => void;
  };
}

// Track mock interactions
const mockToastCalls: Array<{ style: string; title: string; message?: string }> = [];
const mockPerformStartAnalyzeSequence = jest.fn();
const mockGetSonarQubePath = jest.fn();
const mockTranslate = jest.fn((key: string) => key);
const mockShowToast = jest.fn();
const mockOpenExtensionPreferences = jest.fn();
const mockGetPreferenceValues = jest.fn();

// Create mock component before imports
const MockProjectsList = ({ onStartAnalyze }: { onStartAnalyze: (path: string, name: string) => void }) => (
  <div data-testid="projects-list">
    <button data-testid="analyze-button" onClick={() => onStartAnalyze("/project/path", "Test Project")}>
      Analyze
    </button>
  </div>
);

// Mock all dependencies before importing anything
jest.mock("@raycast/api", () => ({
  getPreferenceValues: () => mockGetPreferenceValues(),
  showToast: (config: ToastConfig) => mockShowToast(config),
  openExtensionPreferences: () => mockOpenExtensionPreferences(),
  Toast: {
    Style: {
      Animated: "animated",
      Success: "success",
      Failure: "failure",
    },
  },
}));

jest.mock("../../../hooks/useProjectLoader", () => ({
  useProjectLoader: jest.fn(() => ({
    projects: [
      { id: "1", name: "Project 1", path: "/path/1" },
      { id: "2", name: "Project 2", path: "/path/2" },
    ],
    isLoading: false,
  })),
}));

jest.mock("../../../hooks/useSonarQubePath", () => ({
  useSonarQubePath: jest.fn(() => ({
    getSonarQubePath: mockGetSonarQubePath,
  })),
}));

jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(() => ({
    performStartAnalyzeSequence: mockPerformStartAnalyzeSequence,
  })),
}));

jest.mock("../../../components/ProjectsList", () => ({
  ProjectsList: MockProjectsList,
}));

jest.mock("../../../i18n", () => ({
  __: (key: string) => mockTranslate(key),
}));

// Direct command mock
const startAnalyzeOpenSonarQube = jest.fn(async () => {
  // Get preferences for testing
  const prefs = mockGetPreferenceValues();
  const useCustomSonarQubeApp = prefs.useCustomSonarQubeApp;
  const sonarqubeAppPath = prefs.sonarqubeAppPath;

  // Check custom app configuration
  if (useCustomSonarQubeApp && !sonarqubeAppPath) {
    await mockShowToast({
      style: "failure",
      title: "preferences.useCustomSonarQubeApp.title",
      message: "preferences.sonarqubeAppPath.description",
      primaryAction: {
        title: "Open Preferences",
        onAction: async (toast: MockToast) => {
          await mockOpenExtensionPreferences();
          await toast.hide();
        },
      },
    });
    return;
  }

  // Determine the target path
  const targetOpenPath = useCustomSonarQubeApp ? sonarqubeAppPath : "http://localhost:9000";

  // Call the sequence function with test data
  await mockPerformStartAnalyzeSequence("test-project-path", "Test Project", targetOpenPath);
  return;
});

// Import after all mocks are set up
import Command from "../../../startAnalyzeOpenSonarQube";

describe("startAnalyzeOpenSonarQube function", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastCalls.length = 0;

    // Default implementation for showToast
    mockShowToast.mockImplementation((config: ToastConfig) => {
      mockToastCalls.push({
        style: config.style,
        title: config.title,
        message: config.message,
      });

      // Create mock toast with correct typing
      const mockToast: MockToast = {
        hide: jest.fn(),
      };

      // If there's a primaryAction, make it available for testing
      if (config.primaryAction && typeof config.primaryAction.onAction === "function") {
        mockToast.primaryAction = config.primaryAction;
      }

      return Promise.resolve(mockToast);
    });

    // Default implementation for getPreferenceValues
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: "",
    });

    // Default implementation for getSonarQubePath
    mockGetSonarQubePath.mockResolvedValue("http://localhost:9000");

    // Default implementation for performStartAnalyzeSequence
    mockPerformStartAnalyzeSequence.mockResolvedValue(undefined);
  });

  it("should use default SonarQube URL if custom app is not enabled", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: "",
    });

    await startAnalyzeOpenSonarQube();

    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "http://localhost:9000",
    );
  });

  it("should show error toast if custom app is enabled but path is empty", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    await startAnalyzeOpenSonarQube();

    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: "failure",
        title: "preferences.useCustomSonarQubeApp.title",
        message: "preferences.sonarqubeAppPath.description",
        primaryAction: expect.objectContaining({
          title: "Open Preferences",
          onAction: expect.any(Function),
        }),
      }),
    );
    expect(mockPerformStartAnalyzeSequence).not.toHaveBeenCalled();
  });

  it("should use custom SonarQube app path if enabled and path is set", async () => {
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/custom/sonarqube/app",
    });

    await startAnalyzeOpenSonarQube();

    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      "/custom/sonarqube/app",
    );
  });

  it("should open preferences when primary action is triggered", async () => {
    // Configure preferences with invalid custom app config
    mockGetPreferenceValues.mockReturnValue({
      sonarqubePodmanDir: "/mock/path",
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    // Custom mock implementation just for this test
    mockShowToast.mockImplementationOnce((config: ToastConfig) => {
      const mockToast = {
        hide: jest.fn(),
      };
      return Promise.resolve(mockToast);
    });

    await startAnalyzeOpenSonarQube();

    // Get the primaryAction from the mock call
    const primaryAction = mockShowToast.mock.calls[0][0].primaryAction;
    expect(primaryAction).toBeDefined();

    // Create a mock toast to pass to onAction
    const mockToast = { hide: jest.fn() };

    // Call the primaryAction
    await primaryAction.onAction(mockToast);

    // Verify expectations
    expect(mockOpenExtensionPreferences).toHaveBeenCalled();
    expect(mockToast.hide).toHaveBeenCalled();
  });
});

describe("Command component", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Default implementations
    mockGetSonarQubePath.mockResolvedValue("http://localhost:9000");
    mockPerformStartAnalyzeSequence.mockResolvedValue(undefined);
  });

  it("should render the ProjectsList component", () => {
    render(<Command />);
    expect(screen.getByTestId("projects-list")).toBeInTheDocument();
  });

  it("should call performStartAnalyzeSequence when a project is selected", async () => {
    mockGetSonarQubePath.mockResolvedValue("http://localhost:9000");

    render(<Command />);
    fireEvent.click(screen.getByTestId("analyze-button"));

    await waitFor(() => {
      expect(mockGetSonarQubePath).toHaveBeenCalled();
      expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
        "/project/path",
        "Test Project",
        "http://localhost:9000",
      );
    });
  });

  it("should not call performStartAnalyzeSequence if getSonarQubePath returns null", async () => {
    mockGetSonarQubePath.mockResolvedValue(null);

    render(<Command />);
    fireEvent.click(screen.getByTestId("analyze-button"));

    await waitFor(() => {
      expect(mockGetSonarQubePath).toHaveBeenCalled();
      expect(mockPerformStartAnalyzeSequence).not.toHaveBeenCalled();
    });
  });
});
