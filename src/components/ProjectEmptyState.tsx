import { List, ActionPanel, Action, Icon } from "@raycast/api";
import { __ } from "../i18n";

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
            target={<List.Item title={__("projects.management.notImplemented")} />}
            icon={Icon.List}
          />
        </ActionPanel>
      }
    />
  );
}
