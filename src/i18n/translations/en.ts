/**
 * English translations
 */

const translations = {
  common: {
    success: "Success",
    failure: "Failure",
    error: "Error",
    warning: "Warning",
    loading: "Loading...",
    completed: "Completed",
    cancel: "Cancel",
    save: "Save",
    delete: "Delete",
    edit: "Edit",
    add: "Add",
    select: "Select",
    continue: "Continue",
    back: "Back",
  },
  
  terminal: {
    completed: "Script in terminal finished. You can close this window.",
    executing: "Executing: {{command}}",
    preparation: "Preparing environment...",
    commandRunning: "Command in progress...",
    commandSuccess: "Command completed successfully",
    commandError: "Command failed: {{error}}",
    openingTerminal: "Opening terminal...",
    progressTracking: "Progress: {{status}}",
  },
  
  commands: {
    startSonarQube: {
      title: "Start SonarQube Locally (Podman)",
      description: "Starts local SonarQube instance using Podman. Checks if SonarQube is already running and notifies the user in that case.",
      starting: "Starting SonarQube...",
      alreadyRunning: "SonarQube is already running",
      startSuccess: "SonarQube started successfully",
      startError: "Error starting SonarQube",
      startingPodman: "Starting Local SonarQube (Podman)",
      success: "SonarQube started",
      accessUrl: "Access at",
      waiting: "Waiting for SonarQube to fully start",
      pleaseWait: "SonarQube is starting up, please wait a moment",
      checkingStatus: "Checking SonarQube status...",
      initializing: "SonarQube might be initializing. Checking again with longer timeout...",
      statusChecking: "Checking SonarQube status...",
      statusInitializing: "SonarQube might be initializing. Checking again with longer timeout...",
      statusRunning: "SonarQube is running",
      statusNotRunning: "SonarQube is not running",
      statusUnknown: "SonarQube status is unknown",
    },
    
    stopSonarQube: {
      title: "Stop SonarQube Locally (Podman)",
      description: "Stops the local SonarQube instance and Podman machine. Attempts to stop ongoing Gradle tasks in all configured projects first.",
      stopping: "Stopping SonarQube...",
      stoppingGradle: "Stopping Gradle tasks first...",
      stopSuccess: "SonarQube has been stopped successfully",
      stopError: "Failed to stop SonarQube",
    },
    
    openSonarQubeApp: {
      title: "Open SonarQube App",
      description: "Opens the SonarQube application or its web URL.",
      opening: "Opening SonarQube...",
      openError: "Failed to open SonarQube",
    },
    
    runSonarAnalysis: {
      title: "Run SonarQube Analysis",
      description: "Select a project to run SonarQube analysis and open the app. Manage projects from this command.",
      noProjects: "No projects configured",
      selectProject: "Select a project",
      addNewProject: "Add new project",
      editProject: "Edit project",
      deleteProject: "Delete project",
      runningAnalysis: "Running SonarQube analysis",
      analysisSuccess: "SonarQube analysis completed successfully",
      analysisError: "Failed to run SonarQube analysis",
      searchPlaceholder: "Search projects...",
    },
    
    allInOne: {
      title: "Start, Analyze SonarQube & Open App",
      description: "Starts SonarQube if needed, runs analysis, and opens the app in one step.",
      actionTitle: "Start SonarQube, Run Analysis & Open App",
      success: "SonarQube Sequence Initiated for {{projectName}}",
      error: "Failed to Initiate SonarQube Sequence",
      configureFirst: "Please configure projects in the 'Run SonarQube Analysis' command first.",
    },
    
    startAnalyzeOpenSonarQube: {
      title: "Start, Analyze SonarQube & Open App",
      description: "Starts SonarQube, then select a project to run analysis and open the app. Manage projects from this command.",
      initializing: "Initializing SonarQube environment...",
      startingAnalysis: "Starting SonarQube analysis...",
      openingResults: "Opening SonarQube results...",
      allInOneSuccess: "SonarQube started, analysis completed, and results opened",
      allInOneError: "Failed to complete SonarQube workflow",
    },
  },
  
  projects: {
    management: {
      title: "Project Management",
      addProject: "Add Project",
      editProject: "Edit Project",
      deleteProject: "Delete Project",
      confirmDelete: "Are you sure you want to delete this project?",
      goToManager: "Go to Project Manager",
      notImplemented: "This would navigate to project manager (not implemented)",
    },
    form: {
      name: "Project Name",
      path: "Project Path",
      namePlaceholder: "Enter project name",
      pathPlaceholder: "Enter full path to project",
      nameRequired: "Project name is required",
      pathRequired: "Project path is required",
      saveSuccess: "Project saved successfully",
      saveError: "Failed to save project",
      deleteSuccess: "Project deleted successfully",
      deleteError: "Failed to delete project",
    },
  },
  
  errors: {
    commandNotFound: "Command not found. Make sure all required tools are installed.",
    permissionDenied: "Permission denied. Try running with proper permissions.",
    fileNotFound: "File or directory not found. Check that all paths are correct.",
    connectionFailed: "Connection failed. Check your network settings.",
    connectionRefused: "Connection refused. Make sure the service is running.",
    cannotConnect: "Cannot connect. Verify the service is running and accessible.",
    timeout: "Operation timed out. The service might be slow or unavailable.",
    appleScriptError: "AppleScript error. Try again or restart Raycast.",
    terminalIssue: "Terminal issue. Make sure Terminal app is available.",
    generic: "An error occurred: {{message}}",
  },
  
  preferences: {
    sonarqubePodmanDir: {
      title: "SonarQube Podman Directory",
      description: "Directory containing Podman setup for SonarQube.",
      placeholder: "/path/to/sonarqube_podman_dir",
    },
    useCustomSonarQubeApp: {
      title: "Use Custom SonarQube Path/URL",
      label: "Specify a custom SonarQube application or URL to open.",
      description: "If checked, specify a custom SonarQube application path or URL in the field below. Otherwise, http://localhost:9000 will be used.",
    },
    sonarqubeAppPath: {
      title: "Custom SonarQube App Path/URL",
      description: "Path or URL for your SonarQube. Used only if 'Use Custom SonarQube Path/URL' is checked (in extension settings). Can be left blank if not using a custom path.",
      placeholder: "e.g., /App/Sonar.app or http://custom.sonar:9000 or leave blank",
    },
    language: {
      title: "Language",
      description: "Interface language for the extension. If not set, will try to use your system language.",
      options: {
        en: "English",
        es: "Spanish (Español)",
        auto: "Auto-detect (System language)",
      },
    },
  },
};

export default translations;
