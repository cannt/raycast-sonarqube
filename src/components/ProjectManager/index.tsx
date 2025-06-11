import React, { useState } from "react";
import { ActionPanel, Action, List, Icon, showToast, Toast, useNavigation } from "@raycast/api";
import { useProjectLoader } from "../../hooks/useProjectLoader";
import { __ } from "../../i18n";
import { Project, saveProject, deleteProject } from "../../utils/projectManagement";

/**
 * Component for managing projects
 */
export function ProjectManager() {
  const { projects, isLoading, error } = useProjectLoader();
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Function to handle project save
  const handleSaveProject = async (values: { name: string; path: string }, projectId?: string) => {
    try {
      await saveProject({
        id: projectId || Math.random().toString(36).substring(2, 9),
        name: values.name,
        path: values.path
      });
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.saveSuccess")
      });
      // Trigger refresh of project list
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: __("projects.form.saveError"),
        message: String(err)
      });
    }
  };

  // Function to handle project deletion
  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProject(projectId);
      await showToast({
        style: Toast.Style.Success,
        title: __("projects.form.deleteSuccess")
      });
      // Trigger refresh of project list
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      showToast({
        style: Toast.Style.Failure,
        title: __("projects.form.deleteError"),
        message: String(err)
      });
    }
  };

  return (
    <List 
      isLoading={isLoading} 
      searchBarPlaceholder={__("common.search")}
      // Force refresh when the trigger changes
      key={`project-list-${refreshTrigger}`}
    >
      <List.Section title={__("projects.management.title")}>
        {projects.length > 0 ? (
          projects.map((project: Project) => (
            <List.Item
              key={project.id}
              title={project.name}
              subtitle={project.path}
              accessories={[
                {
                  icon: { source: Icon.Folder },
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
                          project={project}
                          onSubmit={(values) => handleSaveProject(values, project.id)}
                        />
                      }
                    />
                    <Action
                      title={__("projects.management.deleteProject")}
                      icon={Icon.Trash}
                      style={Action.Style.Destructive}
                      onAction={() => handleDeleteProject(project.id)}
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
                      onSubmit={(values) => handleSaveProject(values)}
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
              <Action
                title={__("projects.management.addProject")}
                icon={Icon.Plus}
                onAction={() => {
                  const FormComponent = () => (
                    <ProjectForm onSubmit={(values) => handleSaveProject(values)} />
                  );
                  useNavigation().push(<FormComponent />);
                }}
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
