import * as React from "react";
import { useProjectLoader } from "../hooks/useProjectLoader";
import { useSonarQubePath } from "../hooks/useSonarQubePath";
import { useCommandSequencer } from "../hooks/useCommandSequencer";
import { ProjectsList } from "../components/ProjectsList";

/**
 * React component for the combined start, analyze, and open SonarQube command
 */
export function StartAnalyzeOpenSonarQubeComponent() {
  // Use our custom hooks to manage state and logic
  const { projects, isLoading } = useProjectLoader();
  const { getSonarQubePath } = useSonarQubePath();
  const { performStartAnalyzeSequence } = useCommandSequencer();
  
  /**
   * Handler for when a user selects a project to analyze
   */
  const handleStartAnalyzeProject = async (projectPath: string, projectName: string) => {
    const targetOpenPath = await getSonarQubePath();
    if (!targetOpenPath) {
      // Show error toast when SonarQube path is not available
      const { showToast } = require("@raycast/api");
      await showToast({
        style: "Failure",
        title: "SonarQube path not found"
      });
      return;
    }
    
    await performStartAnalyzeSequence(projectPath, projectName, targetOpenPath);
  };
  
  // Render using our new component structure
  return (
    <ProjectsList 
      projects={projects} 
      isLoading={isLoading} 
      onStartAnalyze={handleStartAnalyzeProject} 
    />
  );
}
