import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { ProjectListItem } from "../../ProjectListItem";
import { __ } from "../../../i18n";

// Mock the translation function
jest.mock("../../../i18n", () => ({
  __: (key: string) => `translated:${key}`,
}));

// Mock the Raycast API components
jest.mock("@raycast/api", () => ({
  List: {
    Item: ({ title, subtitle, icon, actions }: any) => (
      <div data-testid="list-item">
        <h3>{title}</h3>
        <p>{subtitle}</p>
        <div data-testid="actions">{actions}</div>
      </div>
    ),
  },
  ActionPanel: ({ title, children }: any) => (
    <div data-testid="action-panel" title={title}>
      {children}
    </div>
  ),
  Action: ({ title, icon, onAction }: any) => (
    <button data-testid="action-button" onClick={onAction}>
      {title}
    </button>
  ),
  Icon: {
    Terminal: "terminal-icon",
    Play: "play-icon",
  },
}));

describe("ProjectListItem", () => {
  const mockProject = {
    id: "1",
    name: "Test Project",
    path: "/path/to/project",
  };

  const mockOnStartAnalyze = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders project information correctly", () => {
    const { getByText } = render(
      <ProjectListItem 
        project={mockProject} 
        onStartAnalyze={mockOnStartAnalyze} 
      />
    );

    expect(getByText(mockProject.name)).toBeTruthy();
    expect(getByText(mockProject.path)).toBeTruthy();
  });

  it("calls onStartAnalyze when the action is triggered", () => {
    const { getByTestId } = render(
      <ProjectListItem 
        project={mockProject} 
        onStartAnalyze={mockOnStartAnalyze} 
      />
    );

    // Click the action button
    const actionButton = getByTestId("action-button");
    fireEvent.click(actionButton);

    expect(mockOnStartAnalyze).toHaveBeenCalledWith(mockProject.path, mockProject.name);
  });
});
