import React from "react";
import { render } from "@testing-library/react";
import { ProjectEmptyState } from "../../ProjectEmptyState";
import { __ } from "../../../i18n";

// Mock the translation function
jest.mock("../../../i18n", () => ({
  __: (key: string) => `translated:${key}`,
}));

// Mock the Raycast API components
jest.mock("@raycast/api", () => ({
  List: {
    EmptyView: ({ title, description, actions }: any) => (
      <div data-testid="empty-view">
        <h1>{title}</h1>
        <p>{description}</p>
        <div>{actions}</div>
      </div>
    ),
  },
  ActionPanel: ({ children }: any) => <div data-testid="action-panel">{children}</div>,
  Action: {
    Push: ({ title, icon }: any) => <button data-testid="push-action">{title}</button>,
  },
  Icon: {
    Info: "info-icon",
    List: "list-icon",
  },
}));

describe("ProjectEmptyState", () => {
  it("renders correctly", () => {
    const { getByTestId, getByText } = render(<ProjectEmptyState />);

    // Check that the empty state is rendered
    const emptyView = getByTestId("empty-view");
    expect(emptyView).toBeTruthy();

    // Check for translated text
    expect(getByText("translated:commands.runSonarAnalysis.noProjects")).toBeTruthy();
    expect(getByText("translated:commands.allInOne.configureFirst")).toBeTruthy();
    
    // Check that the action button is rendered
    expect(getByText("translated:projects.management.goToManager")).toBeTruthy();
  });
});
