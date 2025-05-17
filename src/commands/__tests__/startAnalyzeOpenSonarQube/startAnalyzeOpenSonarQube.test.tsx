import React from "react";
import { render, fireEvent } from "@testing-library/react";
import Command from "../../startAnalyzeOpenSonarQube.refactored";
import { useProjectLoader } from "../../../hooks/useProjectLoader";
import { useSonarQubePath } from "../../../hooks/useSonarQubePath";
import { useCommandSequencer } from "../../../hooks/useCommandSequencer";
import { __ } from "../../../i18n";

// Mock the hooks
jest.mock("../../../hooks/useProjectLoader", () => ({
  useProjectLoader: jest.fn(),
}));

jest.mock("../../../hooks/useSonarQubePath", () => ({
  useSonarQubePath: jest.fn(),
}));

jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(),
}));

// Mock the i18n function
jest.mock("../../../i18n", () => ({
  __: (key: string, params?: any) => {
    if (params) {
      return `translated:${key}:${JSON.stringify(params)}`;
    }
    return `translated:${key}`;
  },
}));

// Mock the ProjectsList component
jest.mock("../../../components/ProjectsList", () => {
  return {
    ProjectsList: jest.fn(({ projects, isLoading, onStartAnalyze }) => {
      // Simulate the component by returning a valid React element
      setTimeout(() => {
        if (onStartAnalyze && typeof onStartAnalyze === 'function') {
          onStartAnalyze("/test/path", "Test Project");
        }
      }, 0);
      
      return <div data-testid="projects-list">
        <div data-testid="projects-list-props">{JSON.stringify({ projects, isLoading })}</div>
        <button 
          data-testid="test-click-button" 
          onClick={() => onStartAnalyze("/test/path", "Test Project")}
        >
          Click
        </button>
      </div>;
    })
  };
});

const mockUseProjectLoader = useProjectLoader as jest.Mock;
const mockUseSonarQubePath = useSonarQubePath as jest.Mock;
const mockUseCommandSequencer = useCommandSequencer as jest.Mock;

describe("Command component", () => {
  const mockGetSonarQubePath = jest.fn();
  const mockPerformStartAnalyzeSequence = jest.fn();
  const mockProjects = [
    { id: "1", name: "Project 1", path: "/path/to/project1" },
    { id: "2", name: "Project 2", path: "/path/to/project2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    mockUseProjectLoader.mockReturnValue({
      projects: mockProjects,
      isLoading: false,
      error: null,
    });
    
    mockUseSonarQubePath.mockReturnValue({
      getSonarQubePath: mockGetSonarQubePath,
      pathError: null,
    });
    
    mockUseCommandSequencer.mockReturnValue({
      performStartAnalyzeSequence: mockPerformStartAnalyzeSequence,
    });
    
    mockGetSonarQubePath.mockResolvedValue("http://localhost:9000");
  });

  it("renders with correct props", () => {
    // Render the component
    render(<Command />);
    
    // Check that the hooks were called
    expect(mockUseProjectLoader).toHaveBeenCalled();
    expect(mockUseSonarQubePath).toHaveBeenCalled();
    expect(mockUseCommandSequencer).toHaveBeenCalled();
  });

  it("calls performStartAnalyzeSequence when a project is selected", async () => {
    // Render the component
    render(<Command />);
    
    // Wait for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should call getSonarQubePath and then performStartAnalyzeSequence
    expect(mockGetSonarQubePath).toHaveBeenCalled();
    expect(mockPerformStartAnalyzeSequence).toHaveBeenCalledWith(
      "/test/path",
      "Test Project",
      "http://localhost:9000"
    );
  });

  it("handles path resolution error", async () => {
    // Mock path resolution error
    mockGetSonarQubePath.mockResolvedValueOnce(null);
    
    // Render the component
    render(<Command />);
    
    // Wait for the async operation to complete
    await new Promise(resolve => setTimeout(resolve, 10));

    // Should call getSonarQubePath but not performStartAnalyzeSequence
    expect(mockGetSonarQubePath).toHaveBeenCalled();
    expect(mockPerformStartAnalyzeSequence).not.toHaveBeenCalled();
  });

  it("handles loading state", () => {
    mockUseProjectLoader.mockReturnValueOnce({
      projects: [],
      isLoading: true,
      error: null,
    });

    // Render the component
    render(<Command />);
    
    // Check that ProjectsList was called with loading=true
    const { ProjectsList } = require("../../../components/ProjectsList");
    expect(ProjectsList).toHaveBeenCalled();
    
    // Check the first argument of the first call
    const firstCallArgs = ProjectsList.mock.calls[0][0];
    expect(firstCallArgs).toEqual(expect.objectContaining({
      isLoading: true,
      projects: [],
      onStartAnalyze: expect.any(Function)
    }));
  });
});
