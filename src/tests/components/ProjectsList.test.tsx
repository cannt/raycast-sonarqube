import React from "react";
import { render } from "@testing-library/react";
import { ProjectsList } from "../../components/ProjectsList";
import { __ } from "../../i18n";
import { ProjectEmptyState } from "../../components/ProjectEmptyState";
import { ProjectListItem } from "../../components/ProjectListItem";

// Mock the translation function
jest.mock("../../i18n", () => ({
  __: (key: string) => `translated:${key}`,
}));

// Mock the child components
jest.mock("../../components/ProjectEmptyState", () => ({
  ProjectEmptyState: () => <div data-testid="empty-state">Empty State</div>,
}));

jest.mock("../../components/ProjectListItem", () => ({
  ProjectListItem: ({ project, onStartAnalyze }: any) => (
    <div 
      data-testid="project-item" 
      onClick={() => onStartAnalyze(project.path, project.name)}
    >
      {project.name}
    </div>
  ),
}));

// Mock the Raycast API components
jest.mock("@raycast/api", () => ({
  List: ({ isLoading, navigationTitle, searchBarPlaceholder, children }: any) => (
    <div data-testid="list" data-loading={isLoading}>
      <h2>{navigationTitle}</h2>
      <div data-testid="search-bar">{searchBarPlaceholder}</div>
      <div data-testid="list-content">{children}</div>
      {isLoading && <div data-testid="progress-bar">Loading...</div>}
    </div>
  ),
}));

describe("ProjectsList", () => {
  const mockOnStartAnalyze = jest.fn();

  const mockProjects = [
    { id: "1", name: "Project 1", path: "/path/to/project1" },
    { id: "2", name: "Project 2", path: "/path/to/project2" },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows loading state", () => {
    const { getByTestId } = render(
      <ProjectsList 
        projects={[]} 
        isLoading={true} 
        onStartAnalyze={mockOnStartAnalyze} 
      />
    );

    expect(getByTestId("progress-bar")).toBeTruthy();
    expect(getByTestId("list").getAttribute("data-loading")).toBe("true");
  });

  it("shows empty state when there are no projects", () => {
    const { getByTestId } = render(
      <ProjectsList 
        projects={[]} 
        isLoading={false} 
        onStartAnalyze={mockOnStartAnalyze} 
      />
    );

    expect(getByTestId("empty-state")).toBeTruthy();
  });

  it("renders project list when projects are available", () => {
    const { getAllByTestId } = render(
      <ProjectsList 
        projects={mockProjects} 
        isLoading={false} 
        onStartAnalyze={mockOnStartAnalyze} 
      />
    );

    const projectItems = getAllByTestId("project-item");
    expect(projectItems.length).toBe(2);
    expect(projectItems[0].textContent).toBe("Project 1");
    expect(projectItems[1].textContent).toBe("Project 2");
  });
});
