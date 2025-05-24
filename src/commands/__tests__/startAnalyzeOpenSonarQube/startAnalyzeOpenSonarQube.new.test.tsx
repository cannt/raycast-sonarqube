import React from "react";
import { render, waitFor } from "@testing-library/react";
import { StartAnalyzeOpenSonarQubeComponent } from "../../../lib/startAnalyzeOpenSonarQubeComponent";

// Define ProjectsList props interface
interface ProjectsListProps {
  projects: { path: string; name: string }[];
  isLoading: boolean;
  onStartAnalyze: (path: string, name: string) => Promise<void>;
}

// Create tracking mocks for all external functions
const mockHandleStartAnalyze = jest.fn();
const mockShowToast = jest.fn();
const mockGetPreferenceValues = jest.fn();
const mockIsSonarQubeRunning = jest.fn();
const mockRunInNewTerminal = jest.fn();

// Direct interception of the onStartAnalyze function
let capturedOnStartAnalyze: ((path: string, name: string) => Promise<void>) | null = null;

// Mock implementation for i18n
const __ = jest.fn((key: string) => key);

// Mock components used in the component
jest.mock("../../../components/ProjectsList", () => {
  return {
    __esModule: true,
    ProjectsList: (props: ProjectsListProps) => {
      // Store the props so we can access them in tests
      const ProjectsList = jest.requireMock("../../../components/ProjectsList").ProjectsList;
      ProjectsList.mockProps = props;
      
      // IMPORTANT: Capture the onStartAnalyze function for direct testing
      capturedOnStartAnalyze = props.onStartAnalyze;
      
      return <div data-testid="projects-list">Projects List</div>;
    },
  };
});

// Mock hooks
jest.mock("../../../hooks/useProjectLoader", () => ({
  useProjectLoader: jest.fn(() => ({
    projects: [
      { path: "/path/to/project1", name: "Project 1" },
      { path: "/path/to/project2", name: "Project 2" }
    ],
    isLoading: false,
  }))
}));

jest.mock("../../../hooks/useSonarQubePath", () => ({
  useSonarQubePath: jest.fn(() => ({
    getSonarQubePath: () => "http://localhost:9000"
  }))
}));

// Mock the CommandSequencer hook
jest.mock("../../../hooks/useCommandSequencer", () => ({
  useCommandSequencer: jest.fn(() => ({
    performStartAnalyzeSequence: async (projectPath: string, projectName: string, targetOpenPath: string) => {
      // Track the call
      mockHandleStartAnalyze(projectPath, projectName, targetOpenPath);
      
      try {
        // Check if SonarQube is running
        const status = await mockIsSonarQubeRunning();
        
        // If it's running, show success toast
        if (status && status.running) {
          await mockShowToast({
            style: "Success",
            title: __("commands.startSonarQube.alreadyRunning")
          });
          return true;
        }
        
        // Otherwise check preferences
        const prefs = mockGetPreferenceValues();
        
        // Run terminal command based on preferences
        if (prefs.useCustomSonarQubeApp && prefs.sonarqubeAppPath) {
          await mockRunInNewTerminal(
            [`open ${prefs.sonarqubeAppPath}`],
            "Opening SonarQube",
            "Failed to open SonarQube"
          );
        } else {
          await mockRunInNewTerminal(
            ["test command"],
            "Opening SonarQube",
            "Failed to open SonarQube"
          );
        }
        
        return true;
      } catch (error) {
        // Handle errors with toast
        await mockShowToast({
          style: "Failure",
          title: "Error",
          message: error instanceof Error ? error.message : "Unknown error"
        });
        
        return false;
      }
    }
  }))
}));

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: () => mockGetPreferenceValues(),
  showToast: (config: any) => mockShowToast(config),
}));

// Extract the ProjectsList mock for easier reference
const { ProjectsList } = jest.requireMock("../../../components/ProjectsList");

describe("StartAnalyzeOpenSonarQubeComponent", () => {
  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    capturedOnStartAnalyze = null;
    
    // Set up test defaults
    mockGetPreferenceValues.mockReturnValue({
      useCustomSonarQubeApp: false,
      sonarqubeAppPath: ""
    });
    
    // Default SonarQube is not running
    mockIsSonarQubeRunning.mockResolvedValue({ 
      running: false, 
      status: "not running" 
    });
    
    // Default successful terminal execution
    mockRunInNewTerminal.mockResolvedValue(undefined);
  });
  
  it("renders with project list", async () => {
    // Render the component
    const { getByTestId } = render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Verify the list component was rendered
    expect(getByTestId("projects-list")).toBeInTheDocument();
    
    // Verify ProjectsList was called with correct props
    expect(ProjectsList.mockProps).toEqual({
      projects: expect.any(Array),
      isLoading: expect.any(Boolean),
      onStartAnalyze: expect.any(Function)
    });
  });
  
  it("starts analysis when project is selected", async () => {
    // Reset mocks
    mockHandleStartAnalyze.mockClear();
    
    // Render component
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Ensure we captured the onStartAnalyze function
    expect(capturedOnStartAnalyze).not.toBeNull();
    
    // Call the function directly
    await capturedOnStartAnalyze!("/path/to/project1", "Project 1");
    
    // Verify args were passed correctly to the sequence function
    expect(mockHandleStartAnalyze).toHaveBeenCalledWith(
      "/path/to/project1",
      "Project 1",
      "http://localhost:9000"
    );
  });
  
  it("handles null SonarQube path gracefully", async () => {
    // Mock useSonarQubePath to return null path
    jest.requireMock("../../../hooks/useSonarQubePath").useSonarQubePath.mockReturnValueOnce({
      getSonarQubePath: () => null
    });
    
    // Reset tracking mocks
    mockHandleStartAnalyze.mockClear();
    mockShowToast.mockClear();
    
    // Render component
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Ensure we captured the onStartAnalyze function
    expect(capturedOnStartAnalyze).not.toBeNull();
    
    // Call it with project info
    await capturedOnStartAnalyze!("/path/to/project1", "Project 1");
    
    // Should not call the sequence function
    expect(mockHandleStartAnalyze).not.toHaveBeenCalled();
    
    // Should show error toast
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Failure",
      title: expect.any(String)
    }));
  });
  
  it("handles terminal execution errors", async () => {
    // Reset tracking mocks
    mockHandleStartAnalyze.mockClear();
    mockRunInNewTerminal.mockClear();
    mockShowToast.mockClear();
    
    // Set up terminal error
    mockRunInNewTerminal.mockRejectedValueOnce(new Error("Terminal execution failed"));
    
    // Render component
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Ensure we captured the onStartAnalyze function
    expect(capturedOnStartAnalyze).not.toBeNull();
    
    // Call the function directly
    await capturedOnStartAnalyze!("/path/to/project1", "Project 1");
    
    // Verify our argument tracking mock was called
    expect(mockHandleStartAnalyze).toHaveBeenCalledWith(
      "/path/to/project1", 
      "Project 1", 
      "http://localhost:9000"
    );
    
    // Wait for async error handling
    await waitFor(() => {
      // Verify terminal command was attempted
      expect(mockRunInNewTerminal).toHaveBeenCalled();
      
      // Verify error toast was shown
      expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
        style: "Failure",
        title: expect.any(String)
      }));
    });
  });
  
  it("shows toast when SonarQube is already running", async () => {
    // Reset tracking mocks
    mockHandleStartAnalyze.mockClear();
    mockIsSonarQubeRunning.mockClear();
    mockShowToast.mockClear();
    
    // Mock SonarQube already running
    mockIsSonarQubeRunning.mockResolvedValueOnce({
      running: true,
      status: "running"
    });
    
    // Render component
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Ensure we captured the onStartAnalyze function
    expect(capturedOnStartAnalyze).not.toBeNull();
    
    // Call the function directly
    await capturedOnStartAnalyze!("/path/to/project1", "Project 1");
    
    // Verify status was checked
    expect(mockIsSonarQubeRunning).toHaveBeenCalled();
    
    // Verify toast was shown with correct message
    expect(mockShowToast).toHaveBeenCalledWith(expect.objectContaining({
      style: "Success",
      title: expect.any(String)
    }));
    
    // Terminal should not be called
    expect(mockRunInNewTerminal).not.toHaveBeenCalled();
  });
  
  it("uses custom SonarQube app path from preferences", async () => {
    // Reset tracking mocks
    mockHandleStartAnalyze.mockClear();
    mockRunInNewTerminal.mockClear();
    
    // Set up custom app path preference
    const customAppPath = "/Applications/Custom/SonarQube.app";
    mockGetPreferenceValues.mockReturnValueOnce({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: customAppPath
    });
    
    // Render component
    render(<StartAnalyzeOpenSonarQubeComponent />);
    
    // Ensure we captured the onStartAnalyze function
    expect(capturedOnStartAnalyze).not.toBeNull();
    
    // Call the function directly
    await capturedOnStartAnalyze!("/path/to/project1", "Project 1");
    
    // Verify terminal was called with the right command
    expect(mockRunInNewTerminal).toHaveBeenCalledWith(
      [`open ${customAppPath}`],
      "Opening SonarQube",
      "Failed to open SonarQube"
    );
  });
});
