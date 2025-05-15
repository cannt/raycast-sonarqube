/// <reference types="node" />

import { showToast, Toast, LocalStorage } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import * as http from "http";

export const execAsync = promisify(exec);

const PODMAN_PATH_BIN = "/opt/podman/bin";
const HOMEBREW_PATH_BIN = "/opt/homebrew/bin";

export interface Preferences {
  sonarqubePodmanDir: string;
  useCustomSonarQubeApp: boolean;
  sonarqubeAppPath: string;
}

// Common error patterns and their user-friendly messages
const ERROR_PATTERNS = [
  { pattern: /command not found/i, message: "Command not found. Make sure all required tools are installed." },
  { pattern: /permission denied/i, message: "Permission denied. You may need to run with higher privileges." },
  { pattern: /no such file or directory/i, message: "File or directory not found. Check that paths are correct." },
  { pattern: /connection refused/i, message: "Connection refused. Make sure the service is running." },
  { pattern: /(timeout|timed out)/i, message: "Operation timed out. The service might be unresponsive." },
  { pattern: /cannot access/i, message: "Unable to access resource. Check permissions or network connection." },
  { pattern: /gradle/i, message: "Gradle issue detected. Check your project's build configuration." },
  { pattern: /sonarqube/i, message: "SonarQube error detected. Verify SonarQube server status and configuration." },
  { pattern: /podman/i, message: "Podman error detected. Verify Podman installation and configuration." },
];

/**
 * Get user-friendly error message based on error output
 */
function getUserFriendlyErrorMessage(errorMsg: string): string {
  // Check if error matches any known patterns
  for (const { pattern, message } of ERROR_PATTERNS) {
    if (pattern.test(errorMsg)) {
      return `${message}\n\nDetails: ${errorMsg.substring(0, 100)}${errorMsg.length > 100 ? '...' : ''}`;
    }
  }
  // Default case - return truncated error
  return errorMsg.substring(0, 150) + (errorMsg.length > 150 ? '...' : '');
}

export async function runCommand(
  command: string,
  successMessage: string,
  failureMessage: string,
  options?: { cwd?: string; env?: NodeJS.ProcessEnv },
) {
  // Extract command name for better error reporting
  const commandName = command.split(" ")[0];
  
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Running: ${commandName}...`,
    message: "Preparing environment...",
  });

  try {
    // Update toast to show we're executing
    toast.message = "Executing command...";
    
    const currentProccessEnv = typeof process !== "undefined" ? process.env : {};
    const baseEnv = { ...currentProccessEnv, ...options?.env };

    const currentPath = baseEnv.PATH || "";
    const newPath = `${PODMAN_PATH_BIN}:${HOMEBREW_PATH_BIN}:${currentPath}`;

    const executionEnv = { ...baseEnv, PATH: newPath };

    const { stdout, stderr } = await execAsync(command, { ...options, env: executionEnv });
    
    if (stderr && !stderr.toLowerCase().includes("warning")) {
      toast.style = Toast.Style.Failure;
      toast.title = failureMessage;
      
      // Provide more context with the command that failed
      const friendlyErrorMsg = getUserFriendlyErrorMessage(stderr);
      toast.message = `Command '${commandName}' failed: ${friendlyErrorMsg}`;
      
      // Still log the full error for debugging
      console.error(`Error executing: ${command}`);
      console.error(stderr);
    } else {
      toast.style = Toast.Style.Success;
      toast.title = successMessage;
      
      // Format output for better readability
      if (stdout) {
        const truncatedOutput = stdout.length > 200 ? stdout.substring(0, 200) + '...' : stdout;
        toast.message = truncatedOutput;
        console.log(`Successfully executed: ${command}`);
        console.log(stdout);
      } else {
        toast.message = "Command completed successfully with no output.";
        console.log(`Successfully executed: ${command} (no output)`);
      }
    }
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureMessage;
    
    // Extract and format error message
    const errorMessage = error instanceof Error ? error.message : String(error);
    const friendlyErrorMsg = getUserFriendlyErrorMessage(errorMessage);
    
    // Provide actionable error message
    toast.message = `Failed to execute '${commandName}': ${friendlyErrorMsg}`;
    
    // Log full error for debugging
    console.error(`Failed to execute: ${command}`);
    console.error(errorMessage);
  }
}

export async function runInNewTerminal(
  commands: string[], 
  successMessage: string, 
  failureMessage: string, 
  options?: { trackProgress?: boolean }
) {
  // Extract operation name from first command for better messaging
  const operationName = commands[0]?.split(/\s+/)[0]?.replace(/^cd$/, 'Terminal') || 'Operation';
  
  // Add progress tracking if requested
  const trackProgress = options?.trackProgress !== false;
  let progressCommands = [...commands];
  
  if (trackProgress) {
    // Identify major phases in the command sequence for progress tracking
    const progressMarkers = [
      { pattern: /podman|docker/, message: "Starting containerization software" },
      { pattern: /sonarqube/, message: "Preparing SonarQube environment" },
      { pattern: /gradlew|gradle/, message: "Running Gradle build and tests" },
      { pattern: /test/, message: "Running tests" },
      { pattern: /jacoco/, message: "Generating code coverage report" },
      { pattern: /detekt/, message: "Running code quality analysis" },
      { pattern: /sonar/, message: "Sending data to SonarQube" },
      { pattern: /open/, message: "Opening results" },
    ];
    
    // Insert progress echo statements before relevant commands
    for (let i = 0; i < progressCommands.length; i++) {
      const cmd = progressCommands[i];
      for (const { pattern, message } of progressMarkers) {
        if (pattern.test(cmd) && !cmd.startsWith('echo')) {
          // Insert progress message before this command
          progressCommands.splice(i, 0, `echo "\n▶ Progress: ${message}..."`);  
          i++; // Skip ahead since we just added an element
          break;
        }
      }
    }
    
    // Add timestamp tracking to key commands
    progressCommands = progressCommands.map(cmd => {
      if (cmd.includes('gradle') || cmd.includes('podman') || cmd.includes('sonar')) {
        // Add time tracking for long-running commands
        return `echo "$(date +\"%H:%M:%S\") ▶ Starting: ${cmd.replace(/"/g, '\\"')}" && ${cmd} && echo "$(date +\"%H:%M:%S\") ✓ Completed"`;
      }
      return cmd;
    });
  }
  
  // Add error handling wrapper
  progressCommands.unshift('set -e'); // Make script exit on first error
  progressCommands.push('echo "✅ All operations completed successfully!"');
  
  // Escape double quotes within each command for AppleScript
  const escapedCommands = progressCommands.map((cmd) => cmd.replace(/"/g, '\\"'));
  
  // Create AppleScript command with error trapping
  const appleScriptCommand = `
    tell application "Terminal"
      activate
      set newTab to do script "${escapedCommands.join(" && ")}"
      delay 1
      set custom title of tab 1 of window 1 to "SonarQube Analysis"
    end tell
  `;

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching Terminal",
    message: `Preparing to run ${operationName} in new window...`,
  });

  try {
    await execAsync(`osascript -e '${appleScriptCommand.replace(/'/g, "'\\''")}'`);
    toast.style = Toast.Style.Success;
    toast.title = successMessage;
    toast.message = trackProgress ? 
      "Commands running in Terminal with progress tracking." : 
      "Commands sent to new Terminal window.";
      
    // Update toast with hint about the terminal window
    setTimeout(() => {
      toast.title = "Running in Terminal";
      toast.message = "Check the Terminal window for real-time progress.";
    }, 3000);
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = failureMessage;
    const errorMessage = error instanceof Error ? error.message : String(error);
    const friendlyErrorMsg = getUserFriendlyErrorMessage(errorMessage);
    toast.message = `Could not open Terminal: ${friendlyErrorMsg}`;
    
    // Log full error for debugging
    console.error("Failed to execute AppleScript for new Terminal:");
    console.error(errorMessage);
  }
}

/**
 * Check if SonarQube server is running by making an HTTP request to its status endpoint.
 * 
 * This enhanced version provides sophisticated status detection with the following features:
 * - Intelligent state detection (running, starting, initializing, stopped)
 * - Automatic retry mechanism with exponential backoff
 * - Configurable timeouts for different network conditions
 * - Detailed status reporting for better user feedback
 * - Smart error handling with user-friendly messages
 * 
 * @param options Configuration options for the status check
 * @param options.retries Number of retry attempts if initial check fails (default: 2)
 * @param options.timeout Custom timeout in milliseconds (default: 3000)
 * @param options.detailed When true, returns detailed status object instead of boolean
 * @returns Promise resolving to either a boolean (backward compatibility) or a detailed status object
 *          with running (boolean), status (string), and details (string) properties
 */
export async function isSonarQubeRunning(options?: {
  retries?: number;
  timeout?: number;
  detailed?: boolean;
}): Promise<boolean | { running: boolean; status: string; details?: string }> {
  const maxRetries = options?.retries ?? 2; // Default to 2 retries
  const timeoutMs = options?.timeout ?? 3000; // Default to 3 seconds
  const detailed = options?.detailed ?? false;
  
  let lastError = "";
  let attemptCount = 0;
  
  while (attemptCount <= maxRetries) {
    attemptCount++;
    
    try {
      const result = await checkSonarQubeStatus(timeoutMs);
      
      if (detailed) {
        if (result.status === "up") {
          return { running: true, status: "running", details: "SonarQube is running normally" };
        } else if (result.status === "starting") {
          return { running: false, status: "starting", details: "SonarQube is still starting up" };
        } else {
          return { running: false, status: "error", details: `SonarQube returned status: ${result.status}` };
        }
      }
      
      return result.status === "up";
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      
      // If we've reached max retries, give up
      if (attemptCount > maxRetries) {
        break;
      }
      
      // Exponential backoff between retries (500ms, 1000ms, 2000ms, etc.)
      const delay = Math.min(500 * Math.pow(2, attemptCount - 1), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // If we get here, all attempts failed
  if (detailed) {
    // Differentiate between connection refused (server down) and timeout (server might be starting)
    if (lastError.includes("ECONNREFUSED")) {
      return { running: false, status: "down", details: "SonarQube server is not running" };
    } else if (lastError.includes("timeout")) {
      return { running: false, status: "timeout", details: "SonarQube server is not responding (may be starting)" };
    } else {
      return { running: false, status: "error", details: `Error checking SonarQube: ${lastError}` };
    }
  }
  
  return false;
};

/**
 * Helper function to check SonarQube status with a specific timeout
 * @private
 */
async function checkSonarQubeStatus(timeoutMs: number): Promise<{ status: string }> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: 9000,
      path: "/api/system/status",
      method: "GET",
      timeout: timeoutMs,
    };

    const req = http.get(options, (res) => {
      let data = "";
      
      res.on("data", (chunk) => {
        data += chunk;
      });
      
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 400) {
          try {
            // Try to parse response as JSON to get actual status
            const statusInfo = JSON.parse(data);
            resolve(statusInfo);
          } catch (e) {
            // If we can't parse it but got a 2xx status, assume it's running
            resolve({ status: "up" });
          }
        } else if (res.statusCode === 503) {
          // Service unavailable often means the server is starting
          resolve({ status: "starting" });
        } else {
          reject(new Error(`Unexpected status code: ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });
  });
}

export const SONARQUBE_PROJECTS_STORAGE_KEY = "sonarqubeProjectsList";

export interface Project {
  id: string;
  name: string;
  path: string;
}

export const generateId = () => Math.random().toString(36).substring(2, 11);

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

export async function saveProjects(projects: Project[]): Promise<void> {
  await LocalStorage.setItem(SONARQUBE_PROJECTS_STORAGE_KEY, JSON.stringify(projects));
}
