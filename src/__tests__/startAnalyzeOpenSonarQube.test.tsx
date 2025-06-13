/// <reference types="jest" />

import { render, act } from "@testing-library/react";
import "@testing-library/jest-dom";

// Create a toast tracking object for assertions
const mockToastState = {
  style: null as string | null,
  title: null as string | null,
  message: null as string | null,
  hide: jest.fn(),
};

// Create mock project data
const mockProjects = [
  { id: "test-id", name: "Test Project", path: "/test/path" },
  { id: "test-id-2", name: "Another Project", path: "/another/path" },
];

// Mock all dependencies
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(() => ({
    sonarqubePodmanDir: "/valid/podman/path",
    useCustomSonarQubeApp: false,
    sonarqubeAppPath: "",
  })),
  showToast: jest.fn().mockImplementation(async (options) => {
    mockToastState.style = options.style;
    mockToastState.title = options.title;
    mockToastState.message = options.message;
    return mockToastState;
  }),
  Toast: {
    Style: {
      Animated: "Animated",
      Success: "Success",
      Failure: "Failure",
    },
  },
  openExtensionPreferences: jest.fn(),
  List: {
    Item: jest.fn(({ title, actions }) => (
      <div data-testid={`list-item-${title}`}>
        {title}
        {actions}
      </div>
    )),
    EmptyView: jest.fn(({ title, description }) => (
      <div data-testid="empty-view">
        <div data-testid="empty-title">{title}</div>
        <div data-testid="empty-description">{description}</div>
      </div>
    )),
  },
  ActionPanel: jest.fn(({ children }) => <div data-testid="action-panel">{children}</div>),
  Action: {
    Push: jest.fn(({ title, onAction }) => (
      <button data-testid={`action-${title}`} onClick={onAction}>
        {title}
      </button>
    )),
    SubmitForm: jest.fn(({ title, onAction }) => (
      <button data-testid={`action-${title}`} onClick={onAction}>
        {title}
      </button>
    )),
  },
  Icon: {
    Terminal: "terminal-icon",
    List: "list-icon",
    Play: "play-icon",
    Folder: "folder-icon",
  },
  useNavigation: jest.fn(() => ({
    push: jest.fn(),
    pop: jest.fn(),
  })),
  Keyboard: {
    Shortcut: jest.fn(({ key }) => <div data-testid="keyboard-shortcut">{key}</div>),
  },
}));

// Mock components
jest.mock("../components/ProjectsList", () => ({
  ProjectsList: jest.fn(
    ({
      projects,
      isLoading,
      onStartAnalyze,
    }: {
      projects: Array<{ id: string; name: string; path: string }>;
      isLoading: boolean;
      onStartAnalyze: (path: string, name: string) => void;
    }) => {
      if (isLoading) {
        return (
          <div data-testid="empty-view">
            <div>Loading...</div>
          </div>
        );
      }
      if (projects.length === 0) {
        return (
          <div data-testid="empty-view">
            <div>No projects found</div>
          </div>
        );
      }
      return (
        <div>
          {projects.map((project: { id: string; name: string; path: string }) => (
            <div key={project.id} data-testid={`list-item-${project.name}`}>
              {project.name}
              <button
                data-testid={`action-Analyze-${project.id}`}
                onClick={() => onStartAnalyze(project.path, project.name)}
              >
                Analyze
              </button>
            </div>
          ))}
        </div>
      );
    },
  ),
}));

// Mock hooks
const mockPerformStartAnalyzeSequence = jest.fn();
const mockGetSonarQubePath = jest.fn().mockResolvedValue("http://localhost:9000");

jest.mock("../hooks/useProjectLoader", () => ({
  useProjectLoader: jest.fn().mockReturnValue({
    projects: mockProjects,
    isLoading: false,
    error: null,
  }),
}));

jest.mock("../hooks/useSonarQubePath", () => ({
  useSonarQubePath: jest.fn().mockReturnValue({
    getSonarQubePath: mockGetSonarQubePath,
  }),
}));

jest.mock("../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn().mockReturnValue({
    performStartAnalyzeSequence: mockPerformStartAnalyzeSequence.mockResolvedValue(true),
  }),
}));

// Mock other utilities
jest.mock("../utils/terminal", () => ({
  runInNewTerminal: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("../utils/sonarQubeStatus", () => ({
  isSonarQubeRunning: jest.fn().mockResolvedValue(true),
}));

// Mock i18n
jest.mock("../i18n", () => ({
  __: jest.fn((key) => key),
  useTranslation: jest.fn(() => ({ __: jest.fn((key) => key) })),
}));

// Import after all mocks are set up
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { StartAnalyzeOpenSonarQubeComponent } from "../lib/startAnalyzeOpenSonarQubeComponent";
import { useProjectLoader } from "../hooks/useProjectLoader";

describe("StartAnalyzeOpenSonarQube Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockToastState.style = null;
    mockToastState.title = null;
    mockToastState.message = null;
  });

  it("renders projects correctly", async () => {
    const { findByTestId } = render(<StartAnalyzeOpenSonarQubeComponent />);
    const projectItem = await findByTestId("list-item-Test Project");
    expect(projectItem).toBeInTheDocument();
  });

  it("renders empty state when no projects available", async () => {
    // Override for this test only
    (useProjectLoader as jest.Mock).mockReturnValueOnce({
      projects: [],
      isLoading: false,
      error: null,
    });

    const { findByTestId } = render(<StartAnalyzeOpenSonarQubeComponent />);
    const emptyView = await findByTestId("empty-view");
    expect(emptyView).toBeInTheDocument();
  });

  it("handles analyze action correctly", async () => {
    const { findByTestId } = render(<StartAnalyzeOpenSonarQubeComponent />);

    // Find and click the analyze button
    const analyzeButton = await findByTestId("action-Analyze-test-id");
    await act(async () => {
      analyzeButton.click();
    });

    // Verify the right functions were called
    expect(mockGetSonarQubePath).toHaveBeenCalled();
    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith("/test/path", "Test Project", "http://localhost:9000");
  });
});
