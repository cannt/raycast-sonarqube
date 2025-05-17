/// <reference types="jest" />
import React, { useState, ReactNode, useCallback } from "react";

import { render, fireEvent, waitFor, act } from "@testing-library/react";
import '@testing-library/jest-dom';

// Mock i18n module first
jest.mock("../../i18n", () => ({
  __: jest.fn((key: string) => {
    // Map of translation keys to their English values for testing
    const translations: Record<string, string> = {
      "commands.runSonarAnalysis.title": "Run SonarQube Analysis",
      "projects.management.addProject": "Add Project",
      "projects.management.editProject": "Edit Project",
      "projects.management.deleteProject": "Delete Project",
      "projects.form.name": "Project Name",
      "commands.runSonarAnalysis.noProjects": "No Projects Configured",
      "projects.form.addProject": "Add your SonarQube projects to get started.",
      "projects.form.saveSuccess": "Project saved successfully",
      "projects.form.deleteSuccess": "Project deleted successfully",
      "projects.management.confirmDelete": "Are you sure you want to delete this project?",
      "commands.runSonarAnalysis.runningAnalysis": "Running SonarQube analysis",
      "commands.runSonarAnalysis.analysisSuccess": "SonarQube analysis completed successfully",
      "commands.runSonarAnalysis.analysisError": "Failed to run SonarQube analysis",
      "commands.openSonarQubeApp.opening": "Opening SonarQube",
      "terminal.completed": "Script in terminal finished. You can close this window.",
      "preferences.useCustomSonarQubeApp.title": "Missing Custom SonarQube Path",
      "preferences.sonarqubeAppPath.description": "Custom app path is enabled but not set.",
      "preferences.language.title": "Open Preferences",
    };
    // Handle string interpolation for keys with parameters
    if (key.includes('{{')) {
      return key; // Just return the key with placeholders for simplicity
    }
    return translations[key] || key;
  }),
  // Add the getLanguage function that's used by useTranslation
  getLanguage: jest.fn(() => "en"),
  // Add the t function needed by useTranslation
  t: jest.fn((key: string, params?: Record<string, string>) => {
    // Simplified version that just returns the key
    return key;
  }),
}));

// Also mock the useTranslation hook to avoid issues
jest.mock("../../i18n/useTranslation", () => {
  return jest.fn(() => ({ 
    __: jest.requireMock("../../i18n").__ 
  }));
});

// Create mocks before importing modules that might use them
// Mock Raycast Form.TextField to render as a standard input for testing
const toastStyleMock = {
  Success: "success",
  Failure: "failure",
  Animated: "animated"
};

const showToastMock = jest.fn((config?: any) => ({
  title: config?.title || "",
  message: config?.message || "",
  style: config?.style || "",
  primaryAction: config?.primaryAction || null,
  hide: jest.fn()
}));

const openExtensionPreferencesMock = jest.fn(() => Promise.resolve());
const confirmAlertMock = jest.fn(() => Promise.resolve(true));
const getPreferenceValuesMock = jest.fn(() => ({ 
  useCustomSonarQubeApp: false,
  sonarqubeAppPath: ""
}));

// Don't mock the Command component, but use the original one
// We'll let Jest mock infrastructure handle the imports naturally

jest.mock("@raycast/api", () => {
    // Filter out Raycast-specific props that would cause React warnings
  const filterRaycastProps = (props: any) => {
    const filteredProps = {...props};
    // Remove known Raycast props that cause React warnings
    delete filteredProps.navigationTitle;
    delete filteredProps.markdown;
    delete filteredProps.filtering;
    delete filteredProps.isLoading;
    delete filteredProps.searchBarPlaceholder;
    return filteredProps;
  };

  const List = ({ children, ...props }: any) => <div {...filterRaycastProps(props)}>{children}</div>;
    List.Item = ({ title, subtitle, children, actions, ...props }: any) => {
    // Filter Raycast props
    const safeProps = filterRaycastProps(props);
    return (
      <div {...safeProps} data-testid={`list-item-${title}`}>
        {title}
        {subtitle && <div>{subtitle}</div>}
        {/* Directly render the actions instead of keeping them in a container */}
        {actions}
        {children}
      </div>
    );
  };
    List.EmptyView = ({ title, description, actions, ...props }: any) => {
    // Filter Raycast props
    const safeProps = filterRaycastProps(props);
    return (
      <div {...safeProps} data-testid="empty-view">
        {title}
        {description}
        {/* Directly render the actions */}
        {actions}
      </div>
    );
  };

    const ActionPanel = ({ children, ...props }: any) => <div data-testid="action-panel" {...filterRaycastProps(props)}>{children}</div>;
    ActionPanel.Section = ({ children, ...props }: any) => <div data-testid="action-section" {...filterRaycastProps(props)}>{children}</div>;

  const Action = Object.assign(
    ({ title, onAction, ...props }: any) => {
      // Ignore style prop if it's a string (Style.Destructive)
      const safeProps = {...props};
      if (props.style && typeof props.style === 'string') {
        safeProps['data-style'] = props.style; // Convert to data attribute
      } else if (props.style) {
        safeProps.style = props.style;
      }
      
      // Map internationalized titles to their original test IDs
      // These should match exactly what the tests are looking for
      const titleToIdMap: Record<string, string> = {
        "Run SonarQube Analysis": "Run Analysis",
        "Add Project": "Add Project",
        "Edit Project": "Edit Project",
        "Delete Project": "Delete Project",
        "commands.runSonarAnalysis.title": "Run Analysis",
        "projects.management.addProject": "Add Project",
        "projects.management.editProject": "Edit Project",
        "projects.management.deleteProject": "Delete Project",
      };
      
      // Use the mapped ID or the original title
      const testIdTitle = titleToIdMap[title] || title;
      
      return (
        <button 
          onClick={onAction} 
          data-testid={`action-${testIdTitle}`}
          data-action-title={title} // Added for easier querying
          {...safeProps}
        >
          {title}
        </button>
      );
    },
    { 
      Style: { Destructive: {} }, // Empty object instead of string
      // Add SubmitForm subcomponent
      SubmitForm: ({ title, onSubmit, ...props }: any) => (
        <button 
          type="submit"
          onClick={onSubmit}
          data-testid={`submit-action-${title}`}
          {...props}
        >
          {title}
        </button>
      )
    }
  );

  return {
    List,
    ActionPanel,
    Action,
    Toast: {
      Style: toastStyleMock
    },
    showToast: showToastMock,
    openExtensionPreferences: openExtensionPreferencesMock,
    confirmAlert: confirmAlertMock,
    Form: Object.assign(
      ({ navigationTitle, actions, children, ...props }: any) => (
        <form
          data-navigation-title={navigationTitle}
          data-testid="raycast-form"
          onSubmit={(e) => {
            e.preventDefault();
            // Find submit button and simulate click
            const submitButton = document.querySelector('button[type="submit"]');
            if (submitButton) {
              (submitButton as HTMLButtonElement).click();
            }
          }}
          {...props}
        >
          <div data-testid="form-actions">{actions}</div>
          {children}
        </form>
      ),
      {
        TextField: ({ 
          id, 
          title, 
          placeholder, 
          value, 
          onChange, 
          error, 
          info,
          ...props 
        }: any) => (
          <div data-testid={`form-field-${id}`}>
            <label htmlFor={id}>{title}</label>
            <input
              id={id}
              name={id}
              placeholder={placeholder}
              value={value || ''}
              onChange={(e) => onChange(e.target.value)}
              aria-label={title}
              data-has-error={!!error}
              {...props}
            />
            {error && <div data-testid="field-error">{error}</div>}
            {info && <div data-testid="field-info">{info}</div>}
          </div>
        ),
      }
    ),
    useNavigation: () => ({ push: jest.fn(), pop: jest.fn() }),
    getPreferenceValues: getPreferenceValuesMock,
    Icon: {
      Plus: "plus-icon",
      TextDocument: "text-document-icon",
      Terminal: "terminal-icon",
      Pencil: "pencil-icon",
      Trash: "trash-icon",
    },
    Keyboard: {
      Shortcut: {
        Common: {
          New: { modifiers: ["cmd"], key: "n" },
          Edit: { modifiers: ["cmd"], key: "e" },
          Remove: { modifiers: ["cmd"], key: "backspace" },
        },
      },
    },
  };
});


jest.mock("../../utils", () => ({
  loadProjects: jest.fn(() => Promise.resolve([])),
  saveProjects: jest.fn(() => Promise.resolve()),
  runInNewTerminal: jest.fn(() => Promise.resolve()),
  generateId: jest.fn(() => "mock-id"),
}));

const { loadProjects, saveProjects, runInNewTerminal } = require("../../utils");

// Import components after mocks are defined
// @ts-ignore
import ProjectForm from "../../components/ProjectForm";
import Command from "../../commands/runSonarAnalysis";
// DEBUG: Log what is actually imported
console.log("DEBUG ProjectForm default:", ProjectForm);

// Navigation context for testing Raycast navigation
function NavigationTestWrapper({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<ReactNode[]>([]);

  // Mock push function for navigation
  const push = useCallback((element: ReactNode) => {
    console.log('[NavigationTestWrapper] push called with:', element);
    setStack((prev) => [...prev, element]);
  }, []);

  // Mock pop function for navigation
  const pop = useCallback(() => {
    setStack((prev) => prev.slice(0, -1));
  }, []);

  // Show all content inline to make elements discoverable for testing
  const renderNestedContent = () => {
    if (stack.length > 0) {
      return (
        <div data-testid="navigation-stack">
          {/* Show all stack items for debugging */}
          <div data-testid="stack-previous" style={{ display: 'none' }}>
            {stack.slice(0, -1).map((item, i) => (
              <div key={`stack-${i}`} data-testid={`stack-item-${i}`}>{item}</div>
            ))}
          </div>
          
          {/* Current view */}
          <div data-testid="stack-current">
            {stack[stack.length - 1]}
          </div>
        </div>
      );
    }
    return children;
  };

  // Override the useNavigation to provide push/pop functions
  jest.spyOn(require('@raycast/api'), 'useNavigation').mockReturnValue({ push, pop });

  // Render the current view
  // Fix the React warnings by filtering out any Raycast-specific props
  return <div data-testid="navigation-wrapper">{renderNestedContent()}</div>;
}

describe("runSonarAnalysis UI", () => {
  it("ProjectForm calls onSubmit with correct values", async () => {
    const mockOnSubmit = jest.fn();
    const { getByPlaceholderText, findByText, findByTestId, container } = render(
      <NavigationTestWrapper>
        <ProjectForm onSubmit={mockOnSubmit} />
      </NavigationTestWrapper>
    );
    fireEvent.change(getByPlaceholderText("projects.form.namePlaceholder"), { target: { value: "My Project" } });
    fireEvent.change(getByPlaceholderText("projects.form.pathPlaceholder"), { target: { value: "/my/project" } });
    const submitButton = await findByTestId("submit-action-common.add");
    await act(async () => {
      fireEvent.click(submitButton);
    });
    expect(mockOnSubmit).toHaveBeenCalledWith({ name: "My Project", path: "/my/project" });
  });
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders without crashing and shows empty state", async () => {
    loadProjects.mockResolvedValue([]);
    const { findByText } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    expect(await findByText(/No projects/i)).toBeTruthy();
  });

  it("can add a new project", async () => {
    loadProjects.mockResolvedValue([]);
    const { findByText, getByPlaceholderText, findByTestId, container } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    const addButton = await findByTestId("action-Add Project");
    fireEvent.click(addButton);
    fireEvent.change(getByPlaceholderText("projects.form.namePlaceholder"), { target: { value: "Test Project" } });
    fireEvent.change(getByPlaceholderText("projects.form.pathPlaceholder"), { target: { value: "/tmp/project" } });
    const submitButton = await findByTestId("submit-action-common.add");
    fireEvent.click(submitButton);
    // Debug: log DOM after adding project
    // eslint-disable-next-line no-console
    console.log('DOM after add:', container.innerHTML);
    // Verify saveProjects was called
    await waitFor(() => expect(saveProjects).toHaveBeenCalled());
  });

  it("validates project form input", async () => {
    // Reset mocks at start of test
    saveProjects.mockClear();
    loadProjects.mockResolvedValue([]);
    
    const { findByText, getByPlaceholderText, queryByText, findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click Add button - using test ID instead of text
    const addButton = await findByTestId("action-Add Project");
    fireEvent.click(addButton);
    
    // Submit the form without entering any data (both fields are empty)
    const submitButton = await findByTestId("submit-action-common.add");
    fireEvent.click(submitButton);
    
    // After we click submit with empty fields, validation should prevent form submission
    // and saveProjects should not be called
    
    // Wait briefly to ensure any async operations complete
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Check that saveProjects was not called (validation prevented submission)
    expect(saveProjects).not.toHaveBeenCalled();
    
    // For further verification, we can check that we're still on the form screen
    // by looking for form fields that should still be visible if validation failed
    expect(getByPlaceholderText("projects.form.namePlaceholder")).toBeTruthy();
    expect(getByPlaceholderText("projects.form.pathPlaceholder")).toBeTruthy();
  });

  it("renders project list with 'Run Analysis' button when projects exist", async () => {
    loadProjects.mockResolvedValue([{ id: "mock-id", name: "Test Project", path: "/tmp/project" }]);
    const { findByText, findByTestId, container } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    // Debug: log DOM for inspection
    // Use testId instead of text content
    const runButton = await findByTestId("action-Run Analysis");
    expect(runButton).toBeTruthy();
  });

  it("runs analysis when selecting project", async () => {
    loadProjects.mockResolvedValue([{ id: "mock-id", name: "Test Project", path: "/tmp/project" }]);
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    // Use the test ID instead of the text
    const runButton = await findByTestId("action-Run Analysis");
    fireEvent.click(runButton);
    await waitFor(() => expect(runInNewTerminal).toHaveBeenCalled());
  });

  it("opens edit form with correct values", async () => {
    // Setup a test project
    const testProject = { id: "edit-id", name: "Edit Project", path: "/path/to/edit" };
    loadProjects.mockResolvedValue([testProject]);
    
    // Render command component
    const { findByTestId, getByPlaceholderText } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click the edit button using testId
    const editButton = await findByTestId("action-Edit Project");
    fireEvent.click(editButton);
    
    // Check that form is pre-filled with project data - with i18n placeholders
    const nameField = getByPlaceholderText("projects.form.namePlaceholder");
    const pathField = getByPlaceholderText("projects.form.pathPlaceholder");
    
    // Use DOM assertions that work with our test setup
    expect(nameField).toHaveAttribute('value', 'Edit Project');
    expect(pathField).toHaveAttribute('value', '/path/to/edit');
    
    // Edit the form fields
    fireEvent.change(nameField, { target: { value: "Updated Project" } });
    
    // Submit the form - with i18n key
    const submitButton = await findByTestId("submit-action-common.save");
    fireEvent.click(submitButton);
    
    // Verify saveProjects was called with updated data
    await waitFor(() => {
      expect(saveProjects).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: "edit-id",
            name: "Updated Project",
            path: "/path/to/edit"
          })
        ])
      );
    });
  });

  it("deletes project when confirmed", async () => {
    // Use the mock function we defined
    confirmAlertMock.mockResolvedValue(true); // Simulate user confirming delete
    
    // Setup a test project
    const testProject = { id: "delete-id", name: "Delete Project", path: "/path/to/delete" };
    loadProjects.mockResolvedValue([testProject]);
    
    // Render command component
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click the delete button using testId
    const deleteButton = await findByTestId("action-Delete Project");
    fireEvent.click(deleteButton);
    
    // Verify saveProjects was called with empty array (no more projects)
    await waitFor(() => {
      expect(confirmAlertMock).toHaveBeenCalled();
      expect(saveProjects).toHaveBeenCalledWith([]);
    });
  });

  it("does not delete project when cancelled", async () => {
    // Use the mock function we defined
    confirmAlertMock.mockResolvedValue(false); // Simulate user cancelling delete
    
    // Setup a test project
    const testProject = { id: "nodelete-id", name: "Keep Project", path: "/path/to/keep" };
    loadProjects.mockResolvedValue([testProject]);
    
    // Render command component
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click the delete button using testId
    const deleteButton = await findByTestId("action-Delete Project");
    fireEvent.click(deleteButton);
    
    // Verify saveProjects was NOT called (since deletion was cancelled)
    await waitFor(() => {
      expect(confirmAlertMock).toHaveBeenCalled();
      expect(saveProjects).not.toHaveBeenCalled();
    });
  });

  it("uses custom SonarQube app path when enabled in preferences", async () => {
    // Reset and setup preference mock to use custom app
    getPreferenceValuesMock.mockReset();
    getPreferenceValuesMock.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "/Applications/SonarQube.app"
    });
    
    // Setup a test project
    loadProjects.mockResolvedValue([{ id: "custom-id", name: "Custom App Project", path: "/path/project" }]);
    
    // Render command component
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click run analysis using testId
    const runButton = await findByTestId("action-Run Analysis");
    fireEvent.click(runButton);
    
    // Verify runInNewTerminal was called with the correct custom path
    await waitFor(() => {
      // With our i18n implementation, the command format has changed
      expect(runInNewTerminal).toHaveBeenCalled();
      
      // Get the actual call arguments
      const callArgs = runInNewTerminal.mock.calls[0];
      
      // Check that the custom path is in one of the commands
      const commands = callArgs[0];
      const customPathCommand = commands.find((cmd: string) => 
        cmd.includes("/Applications/SonarQube.app")
      );
      
      expect(customPathCommand).toBeTruthy();
    });
  });

  it("shows error toast when custom app enabled but path not set", async () => {
    // Reset and setup preference mock with invalid config
    getPreferenceValuesMock.mockReset();
    getPreferenceValuesMock.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "" // Empty path
    });
    
    // Setup a test project
    loadProjects.mockResolvedValue([{ id: "error-id", name: "Error Project", path: "/path/project" }]);
    
    // Render command component
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    
    // Find and click run analysis using testId
    const runButton = await findByTestId("action-Run Analysis");
    fireEvent.click(runButton);
    
    // Verify showToast was called with error message
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(expect.objectContaining({
        style: "failure",
        title: "Missing Custom SonarQube Path"
      }));
    });
    
    // Verify runInNewTerminal was NOT called
    expect(runInNewTerminal).not.toHaveBeenCalled();
  });
  
  it("handles primaryAction in error toast", async () => {
    // Reset the original mock implementation
    showToastMock.mockReset();
    
    // Mock implementation to capture the toast object
    let capturedToast: any = null;
    showToastMock.mockImplementation((toast: any) => {
      capturedToast = toast;
      return { 
        title: "",
        message: "",
        style: "",
        primaryAction: null,
        hide: jest.fn() 
      };
    });
    
    // Setup preference mock with invalid config
    getPreferenceValuesMock.mockReset();
    getPreferenceValuesMock.mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "" // Empty path
    });
    
    // Setup a test project
    loadProjects.mockResolvedValue([{ id: "action-id", name: "Action Project", path: "/path/project" }]);
    
    // Render component and trigger analysis
    const { findByTestId } = render(<NavigationTestWrapper><Command /></NavigationTestWrapper>);
    const runButton = await findByTestId("action-Run Analysis");
    fireEvent.click(runButton);
    
    // Wait for toast to be shown
    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalled();
      expect(capturedToast).not.toBeNull();
    });

    
    // Trigger the primary action (open preferences)
    if (capturedToast && capturedToast.primaryAction && capturedToast.primaryAction.onAction) {
      const mockToastHandle = { hide: jest.fn() };
      await capturedToast.primaryAction.onAction(mockToastHandle);
      
      // Verify preferences was opened and toast was hidden
      expect(openExtensionPreferencesMock).toHaveBeenCalled();
      expect(mockToastHandle.hide).toHaveBeenCalled();
    }
  });
});
