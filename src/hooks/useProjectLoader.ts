import { useState, useEffect } from "react";
import { Project, loadProjects } from "../utils";

/**
 * Custom hook to manage loading projects
 * This centralizes the loading logic and state management
 */
export function useProjectLoader() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      try {
        setIsLoading(true);
        setError(null);
        const loadedProjects = await loadProjects();
        setProjects(loadedProjects);
      } catch (err) {
        console.error("Error loading projects:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
        setProjects([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchProjects();
  }, []);

  return { projects, isLoading, error };
}
