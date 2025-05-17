import {
  getPreferenceValues,
  showToast,
  Toast,
  openExtensionPreferences,
  List,
  ActionPanel,
  Action,
  Icon,
  useNavigation,
  Form,
  confirmAlert,
  Keyboard,
} from "@raycast/api";
import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import { Preferences, runInNewTerminal, Project, loadProjects, saveProjects, generateId } from "../utils";
import * as path from "path"; // For path.basename
import { __ } from "../i18n";
import useTranslation from "../i18n/useTranslation";

const DEFAULT_SONARQUBE_URL = "http://localhost:9000";

import ProjectForm from "../ProjectForm";


// === Main Command Component ===
export default function Command() {
  const { push } = useNavigation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const preferences = getPreferenceValues<Preferences>();
  const { __ } = useTranslation(); // Use our translation hook

  // Load projects on initial mount
  useEffect(() => {
    async function fetchProjects() {
      setIsLoading(true);
      setProjects(await loadProjects());
      setIsLoading(false);
    }
    fetchProjects();
  }, []);

  // --- CRUD Handlers ---
  const handleAddProject = useCallback(
    async (values: { name: string; path: string }) => {
      const newProject: Project = { ...values, id: generateId() };
      const updatedProjects = [...projects, newProject];
      setProjects(updatedProjects);
      await saveProjects(updatedProjects);
      await showToast(Toast.Style.Success, __("projects.form.saveSuccess"), newProject.name);
    },
    [projects, __],
  );

  const handleEditProject = useCallback(
    async (id: string, values: { name: string; path: string }) => {
      const updatedProjects = projects.map((p) => (p.id === id ? { ...p, ...values } : p));
      setProjects(updatedProjects);
      await saveProjects(updatedProjects);
      await showToast(Toast.Style.Success, __("projects.form.saveSuccess"), values.name);
    },
    [projects, __],
  );

  const handleDeleteProject = useCallback(
    async (id: string) => {
      if (await confirmAlert({ 
        title: __("projects.management.deleteProject"), 
        message: __("projects.management.confirmDelete") 
      })) {
        const updatedProjects = projects.filter((p) => p.id !== id);
        setProjects(updatedProjects);
        await saveProjects(updatedProjects);
        await showToast(Toast.Style.Success, __("projects.form.deleteSuccess"));
      }
    },
    [projects, __],
  );

  // --- Analysis Action ---
  const performAnalysis = useCallback(
    async (projectPath: string, projectName: string) => {
      let targetOpenPath: string;
      if (preferences.useCustomSonarQubeApp) {
        if (!preferences.sonarqubeAppPath || preferences.sonarqubeAppPath.trim() === "") {
          await showToast({
            style: Toast.Style.Failure,
            title: __("preferences.useCustomSonarQubeApp.title"),
            message: __("preferences.sonarqubeAppPath.description"),
            primaryAction: {
              title: __("preferences.language.title"),
              onAction: async (t) => {
                await openExtensionPreferences();
                t.hide();
              },
            },
          });
          return;
        }
        targetOpenPath = preferences.sonarqubeAppPath;
      } else {
        targetOpenPath = DEFAULT_SONARQUBE_URL;
      }
      const analysisCommands = [
        `cd "${projectPath}"`,
        `echo "--- ${__("commands.runSonarAnalysis.runningAnalysis")} ${projectName} ---"`,
        `./gradlew clean test jacocoTestReport detekt sonar`,
        `echo "--- ${__("commands.runSonarAnalysis.analysisSuccess")}. ${__("commands.openSonarQubeApp.opening")}... ---"`,
        `open "${targetOpenPath}"`,
        `echo "--- ${__("terminal.completed")} ---"`,
      ];
      await runInNewTerminal(
        analysisCommands, 
        __("commands.runSonarAnalysis.analysisSuccess"), 
        __("commands.runSonarAnalysis.analysisError"),
        { trackProgress: true }
      );
    },
    [preferences, __],
  );

  // --- Render List ---
  return (
    <List
      isLoading={isLoading}
      navigationTitle={__("commands.runSonarAnalysis.title")}
      actions={
        <ActionPanel>
          <Action
            title={__("projects.management.addProject")}
            icon={Icon.Plus}
            onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
            shortcut={Keyboard.Shortcut.Common.New}
          />
        </ActionPanel>
      }
    >
      {projects.length === 0 && !isLoading ? (
        <List.EmptyView
          key="empty-view"
          title={__("commands.runSonarAnalysis.noProjects")}
          description={__("projects.form.addProject")}
          actions={
            <ActionPanel>
              <Action
                title={__("projects.management.addProject")}
                icon={Icon.Plus}
                onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
              />
            </ActionPanel>
          }
        />
      ) : (
        projects.map((project) => (
          <List.Item
            key={project.id}
            icon={Icon.TextDocument}
            title={project.name}
            subtitle={project.path}
            actions={
              <ActionPanel title={`${__("projects.form.name")}: ${project.name}`}>
                <Action
                  title={__("commands.runSonarAnalysis.title")}
                  icon={Icon.Terminal}
                  onAction={() => performAnalysis(project.path, project.name)}
                />
                <Action
                  title={__("projects.management.editProject")}
                  icon={Icon.Pencil}
                  shortcut={Keyboard.Shortcut.Common.Edit}
                  onAction={() =>
                    push(<ProjectForm project={project} onSubmit={(values) => handleEditProject(project.id, values)} />)
                  }
                />
                <Action
                  title={__("projects.management.deleteProject")}
                  icon={Icon.Trash}
                  style={Action.Style.Destructive}
                  shortcut={Keyboard.Shortcut.Common.Remove}
                  onAction={() => handleDeleteProject(project.id)}
                />
                <ActionPanel.Section>
                  <Action
                    title={__("projects.management.addProject")}
                    icon={Icon.Plus}
                    onAction={() => push(<ProjectForm onSubmit={handleAddProject} />)}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
                  />
                </ActionPanel.Section>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
