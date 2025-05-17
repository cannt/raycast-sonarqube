/**
 * Project management utilities
 */

import { LocalStorage } from "@raycast/api";

export const SONARQUBE_PROJECTS_STORAGE_KEY = "sonarqubeProjectsList";

/**
 * Project interface representing a SonarQube project
 */
export interface Project {
  id: string;
  name: string;
  path: string;
}

/**
 * Generate a random ID for new projects
 */
export const generateId = () => Math.random().toString(36).substring(2, 11);

/**
 * Load projects from LocalStorage
 */
export async function loadProjects(): Promise<Project[]> {
  const storedProjects = await LocalStorage.getItem<string>(SONARQUBE_PROJECTS_STORAGE_KEY);
  if (storedProjects) {
    try {
      return JSON.parse(storedProjects) as Project[];
    } catch (e) {
      console.error("Failed to parse stored projects:", e);
      return [];
    }
  }
  return [];
}

/**
 * Save projects to LocalStorage
 */
export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(SONARQUBE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}
