import React from "react";
import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { __ } from "../../i18n";
import { ProjectManager } from "../ProjectManager";

/**
 * Component for showing an empty state when no projects are available
 * Extracted from the main component for better testability and reuse
 */
export function ProjectEmptyState() {
  return (
    <List.EmptyView
      key="empty-view"
      title={__("commands.runSonarAnalysis.noProjects")}
      description={__("commands.allInOne.configureFirst")}
      icon={Icon.Info}
      actions={
        <ActionPanel>
          <Action.Push
            title={__("projects.management.goToManager")}
            target={<ProjectManager />}
            icon={Icon.List}
          />
        </ActionPanel>
      }
    />
  );
}
