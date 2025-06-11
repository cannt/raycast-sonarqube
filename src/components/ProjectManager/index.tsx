import React from "react";
import { ActionPanel, Action, List, Icon } from "@raycast/api";
import { useProjectLoader } from "../../hooks/useProjectLoader";
import { __ } from "../../i18n";
import { Project } from "../../utils/projectManagement";

/**
 * Component for managing projects
 */
export function ProjectManager() {
  const { projects, isLoading, addProject, removeProject } = useProjectLoader();

  return (
    <List isLoading={isLoading} searchBarPlaceholder={__("common.search")}>
      <List.Section title={__("projects.management.title")}>
        {projects.length > 0 ? (
          projects.map((project: Project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.path}
              accessories={[
                {
                  icon: { source: "folder-16" },
                  text: project.path,
                },
              ]}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action.Push
                      title={__("projects.management.editProject")}
                      icon={Icon.Pencil}
                      target={
                        <ProjectForm
                          projectToEdit={project}
                          onSaveSuccess={() => {
                            // This would refresh the projects list
                          }}
                        />
                      }
                    />
                    <Action
                      title={__("projects.management.deleteProject")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => {
                        // Show confirmation before deleting
                        if (removeProject) {
                          removeProject(project.id);
                        }
                      }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          ))
        ) : (
          <List.EmptyView
            title={__("commands.runSonarAnalysis.noProjects")}
            description={__("commands.allInOne.configureFirst")}
            icon={Icon.Info}
            actions={
              <ActionPanel>
                <Action.Push
                  title={__("projects.management.addProject")}
                  target={
                    <ProjectForm
                      onSaveSuccess={() => {
                        // This would refresh the projects list
                      }}
                    />
                  }
                  icon={Icon.Plus}
                />
              </ActionPanel>
            }
          />
        )}
      </List.Section>
      <List.Section title={__("projects.management.actions")}>
        <List.Item
          title={__("projects.management.addProject")}
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                title={__("projects.management.addProject")}
                target={
                  <ProjectForm
                    onSaveSuccess={() => {
                      // This would refresh the projects list
                    }}
                  />
                }
                icon={Icon.Plus}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}

// Import at the end to avoid circular dependencies
import { ProjectForm } from "../ProjectForm";
