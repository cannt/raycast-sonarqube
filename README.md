# SonarQube Tools - Raycast Extension

This Raycast extension provides a suite of commands to manage a local SonarQube instance (via Podman) and interact with SonarQube projects. The extension now supports **multi-project** workflows, allowing you to configure and analyze multiple projects seamlessly.

It simplifies common SonarQube workflows, allowing you to start/stop your SonarQube environment, run analyses, and open the SonarQube application directly from Raycast.

![CI](https://github.com/cannt/raycast-sonarqube/actions/workflows/ci.yml/badge.svg)

## Test Coverage

The extension has comprehensive test coverage to ensure stability and reliability:

- **Overall Coverage**: 92.59% statements, 84.35% branches, 91.42% functions, 92.61% lines
- **Key Components**:
  - i18n (Internationalization): 91.52% overall coverage with 88% branch coverage
  - startSonarQube: 100% coverage
  - startAnalyzeOpenSonarQube.refactored.tsx: 100% statement coverage, 88.88% branch coverage
  - openSonarQubeApp: 100% coverage
  - ProjectForm: 100% coverage
  - runSonarAnalysis: 96.42% statement coverage, 91.66% branch coverage
  - utils.ts: 86.53% statements, 71.64% branches, 94.73% functions coverage
  - hooks: 100% statement/line coverage, 88.23% branch coverage

All 302 tests are now passing with zero failures. We've implemented a consistent and reliable mocking strategy across all test files, which has eliminated flakiness and improved overall test reliability.

## Recent Improvements

### Component Architecture Refactoring (May 16, 2025)

The `startAnalyzeOpenSonarQube` component has been refactored into smaller, more testable pieces:

- **Custom Hooks**:
  - `useProjectLoader`: Manages loading and state for projects
  - `useSonarQubePath`: Handles resolving the SonarQube path from preferences
  - `useCommandSequencer`: Contains the command sequence execution logic

- **UI Components**:
  - `ProjectEmptyState`: Handles the empty state UI when no projects are available
  - `ProjectListItem`: Renders individual project items
  - `ProjectsList`: Main list component that integrates the above components

This refactoring improves:
- **Testability**: Each component and hook has a single responsibility
- **Maintainability**: Easier to understand and modify individual parts
- **Reusability**: Components can be reused in other parts of the application

## Features

Currently, the extension offers the following commands, discoverable in Raycast via English or Spanish terms:

1.  **Start SonarQube Locally (Podman)**
    *   **Description:** Starts the local SonarQube instance using Podman. Checks if SonarQube is already running and notifies the user if so. / Inicia la instancia local de SonarQube usando Podman. Verifica si SonarQube ya está en ejecución y notifica al usuario en ese caso.
    *   **Action:** Executes `podman machine start && podman-compose start` in the configured SonarQube Podman directory, only if SonarQube is not already detected via its API.

2.  **Stop SonarQube Locally (Podman)**
    *   **Description:** Stops the local SonarQube instance and Podman machine. Attempts to stop ongoing Gradle tasks in all configured projects first. / Para la instancia local de SonarQube y la máquina Podman. Intenta detener primero las tareas de Gradle en curso en todos los proyectos configurados.
    *   **Action:** Executes `./gradlew --stop` in each configured project directory, then `podman-compose stop && podman machine stop` in the configured SonarQube Podman directory.

3.  **Open SonarQube App**
    *   **Description:** Opens the SonarQube application or its web URL. / Abre la aplicación SonarQube o su URL web.
    *   **Action:** Opens `http://localhost:9000` in the default browser if SonarQube is running, or the configured SonarQube application if not.

4.  **Start SonarQube, Analyze & Open Project**
    *   **Description:** Starts SonarQube, runs an analysis on a selected project, and opens the results. / Inicia SonarQube, ejecuta un análisis en un proyecto seleccionado y abre los resultados.
    *   **Action:** First selects a project from configured projects, then runs a sequence of commands including starting SonarQube and executing the Sonar analysis for the selected project with progress tracking.

5.  **Run Sonar Analysis**
    *   **Description:** Runs SonarQube analysis on a selected project. / Ejecuta un análisis de SonarQube en un proyecto seleccionado.
    *   **Action:** Allows selection from multiple configured projects and runs the analysis with detailed progress tracking.


## New Features

### Multi-Project Support

The extension now provides full support for managing multiple SonarQube projects:

- **Project Selection UI**: When running commands that require a project, you can now select from all your configured projects.
- **Project Management**: Easily add, edit, and remove projects through the Raycast UI.
- **Individual Configuration**: Each project maintains its own path and settings.

### Enhanced Localization

The extension now features comprehensive internationalization support:

- **Language Selection**: Choose between English and Spanish through the extension preferences.
- **System Detection**: Automatically detects your system language for a seamless experience.
- **Comprehensive Translations**: All user-facing messages, commands, forms, and notifications are fully translated.
- **Flexible Framework**: Easily extendable to support more languages in the future.

### Terminal Improvements

Terminal interaction has been significantly enhanced:

- **Progress Tracking**: Commands now include progress markers and timestamps for better visibility.
- **Better Error Handling**: More informative error messages and improved failure detection.
- **Visual Indicators**: Added visual indicators to show operation progress and success/failure states.
- **Terminal Window Management**: Improved window titling and organization for better workflow.

## Setup & Configuration

1.  **Prerequisites:**
    *   Node.js (v16+)
    *   npm
    *   Podman and `podman-compose` installed and configured on your system.
    *   A SonarQube setup managed by `podman-compose`.
    *   An RFID (or other) Java/Kotlin project configured for SonarQube analysis with Gradle.
    *   (Optional) A saved web application for SonarQube (e.g., via Orion browser).

2.  **Clone/Install this Extension:**
    *   (Currently, this is a local development setup. If published, installation would be via the Raycast Store.)
    *   For local development, ensure the extension code is in your Raycast extensions development directory.

3.  **Install Dependencies:**
    *   Navigate to the extension's root directory (`sonarqube-tools`) in your terminal.
    *   Run `npm install`.

4.  **Run in Development Mode:**
    *   In the extension's root directory, run `npm run dev`.
    *   Raycast should pick up the extension in development mode.

5.  **Configure Preferences in Raycast:**
    *   Open Raycast and search for "SonarQube Tools" (or any of its command titles).
    *   Navigate to the extension in Raycast Preferences (⌘, → Extensions).
    *   Set the following preferences:
        *   **SonarQube Podman Directory (Required):** The absolute path to your SonarQube `podman-compose` setup directory (e.g., `/Users/youruser/Library/Mobile Documents/com~apple~CloudDocs/AREAS/Mango/sonarqube`).
        *   **RFID Project Directory (Required):** The absolute path to your RFID project directory that will be analyzed (e.g., `/Users/youruser/Desktop/Mango/rfid`). This is also used by the "Stop SonarQube" command to attempt to stop Gradle daemons.
        *   **Custom SonarQube App Path/URL (Required, but can be blank):** The absolute path to your SonarQube application (e.g., `/Users/youruser/Applications/Orion/WebApps/SonarQube.app`) or a custom URL (e.g., `http://custom.sonar:9000`). This field will appear on the initial setup screen. If the "Use Custom SonarQube Path/URL" checkbox below is unchecked, and this field is blank, the extension will default to opening `http://localhost:9000`.
        *   **Use Custom SonarQube Path/URL (Optional Checkbox):** Check this if you want to use the path/URL specified in "Custom SonarQube App Path/URL". If unchecked, the extension defaults to opening `http://localhost:9000`, regardless of what is in the custom path field.
        *   **Language (Optional):** Choose your preferred language for the extension interface. Options include:
            * `en` - English (default)
            * `es` - Spanish
            * If not specified, the extension will attempt to use your system language.

## Usage

Once configured, you can search for the commands in Raycast using English or Spanish terms (e.g., "Start SonarQube", "Iniciar SonarQube", "Analyze RFID", "Ejecutar Análisis RFID").

## Testing & Development

This extension includes a comprehensive test suite with near-complete coverage across all components, ensuring robust functionality and reliability:

### Test Coverage (as of May 2025)

```
-------------------------------------------|---------|----------|---------|---------|----------------------
File                                       | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s    
-------------------------------------------|---------|----------|---------|---------|----------------------
All files                                  |   92.59 |    84.35 |   91.42 |   92.61 |                      
 src                                       |   90.95 |     82.7 |   90.19 |   90.96 |                      
  ProjectForm.tsx                          |     100 |      100 |     100 |     100 |                      
  openSonarQubeApp.tsx                     |     100 |      100 |     100 |     100 |                      
  runSonarAnalysis.tsx                     |   96.42 |    91.66 |   88.88 |   96.22 | 134,188              
  startAnalyzeOpenSonarQube.refactored.tsx |     100 |    88.88 |     100 |     100 | 52                   
  startSonarQube.tsx                       |     100 |      100 |     100 |     100 |                      
  stopSonarQube.tsx                        |   94.44 |      100 |     100 |   94.44 | 39                   
  utils.ts                                 |   86.53 |    71.64 |   94.73 |      86 | Various lines        
 src/components                            |     100 |      100 |     100 |     100 |                      
 src/hooks                                 |     100 |    88.23 |     100 |     100 |                      
 src/i18n                                  |   91.52 |       88 |   83.33 |   91.52 |                      
 src/i18n/translations                     |     100 |      100 |     100 |     100 |                      
-------------------------------------------|---------|----------|---------|---------|----------------------
```

### Key Testing Features

- **Complete Utility Testing**: Core utilities and functions have 100% statement, branch, and function coverage
- **UI Component Testing**: All UI components are thoroughly tested with **Jest** and **@testing-library/react**
- **Mock Infrastructure**: Comprehensive mocks for Raycast API components, enabling accurate simulation of the extension environment
- **Edge Case Coverage**: Error paths and edge cases are exhaustively tested
- **Form Validation**: Complete validation testing for all user inputs and form interactions

### Running Tests

```bash
# Run all tests
npm test

# Run tests with coverage report
npm test -- --coverage

# Test a specific file
npm test -- src/utils.test.ts
```

## Continuous Integration

We've set up GitHub Actions to handle our CI pipeline. Tests run automatically when we push changes to main or open a PR.

### What Our CI Does

- Uses macOS runners to match our dev environment
- Runs the full test suite with coverage reports
- Saves those reports where the team can access them
- Gives instant feedback in GitHub's UI

### How to Check Test Results

When a build finishes, head to the Actions tab in our repo. Click on the latest run, and you'll find downloadable coverage reports in the artifacts section. This helps us track which parts of the code might need more testing love.

### Getting Your Dev Environment CI-Ready

Cloned the repo? If you're just getting started:

```bash
# Make sure everything's tracked in git
git add .  

# Commit your changes with a meaningful message
git commit -m "Your helpful commit message here"

# Push to GitHub to trigger the CI run
git push
```

### On Our CI Roadmap

- Adding Codecov to get those fancy coverage visualizations
- Setting up auto-releases when version bumps happen
- Implementing more code quality checks

### Test Organization

We've organized our tests by component, making it easy to maintain and extend. You'll find:

- Core utilities tested in `utils.test.ts` 
- UI testing for the analysis screen in `runSonarAnalysis.test.tsx`
- Form validation tests in `ProjectForm.import.test.ts`
- Plenty more test files covering each command's functionality

## What's Next on Our Roadmap

### Recently Shipped

- **Complete Test Suite (May 17, 2025)**: All 302 tests are now passing with zero skipped tests, achieving 92.59% statement coverage, 84.35% branch coverage, 91.42% function coverage, and 92.61% line coverage
- **Test Stability Improvements (May 17, 2025)**: Fixed all failing tests by implementing a consistent mocking strategy for HTTP interactions, improved TypeScript type safety in tests, and eliminated flaky tests
- **Enhanced Test Coverage for utils.ts (May 17, 2025)**: Improved coverage for utils.ts from 78.84% to 86.53% for statements and from 56.71% to 71.64% for branches
- **Implemented Previously Skipped Tests (May 17, 2025)**: Added implementations for all skipped tests, including error handling in i18n and enhanced SonarQube status detection

### Coming Soon

- **Codecov Integration**: Adding Codecov to provide visual coverage reports and track changes over time
- **Auto-releases**: Setting up automatic releases when version changes are detected

*   **Enhanced SonarQube Status Detection (May 2025):**
    *   ✅ Intelligent status detection with detailed information about SonarQube state
    *   ✅ Improved handling for different states: running, starting, initializing, or stopped
    *   ✅ Automatic retry logic with configurable timeouts for more reliable detection
    *   ✅ Smart wait times based on detected server state (longer waits when starting, shorter when already running)
    *   ✅ Comprehensive error handling with user-friendly localized messages

*   **Enhanced Localization (May 2025):**
    *   ✅ Comprehensive i18n system with support for English and Spanish
    *   ✅ All user-facing messages, commands, forms, and notifications fully translated
    *   ✅ Dynamic language detection based on user preferences with system language fallback
    *   ✅ Flexible translation system with parameter support for complex messages

*   **Massive Test Coverage Improvements (April 2025):**
    *   ✅ Pushed test coverage past 97% across the board
    *   ✅ Built a solid mocking system for Raycast API components
    *   ✅ Covered edge cases that used to cause headaches

### Currently Working On

*   **Better Analysis Cancellation:**
    *   The stop command now tries to shut down any running Gradle tasks
    *   We're exploring better ways to handle process termination when analyses run in separate terminals

### Coming Soon

*   **CI Pipeline: Mostly Done! ✅**
    *   ✅ Tests run automatically when code changes
    *   ✅ Reports show exactly where coverage might be lacking
    *   ⬜ Next up: automating our release process

*   **Multi-Project Support: ✅**
    *   ✅ Implemented multi-project management beyond just the RFID project
    *   ✅ Added a project picker to work with multiple SonarQube targets
    *   ✅ Built a UI for adding, editing, and removing projects
    *   ✅ Enhanced terminal feedback with progress tracking

*   **Advanced UI/UX Improvements: Planned ⬜**
    *   ⬜ More detailed analysis progress reporting
    *   ⬜ Custom notification sounds for long-running operations
    *   ⬜ Savable analysis profiles with different settings

*   **Terminal Command Refinements:**
    *   Better error messages when things go sideways
    *   Progress tracking so you're not left wondering about long-running analyses

*   **Better Localization Support:**
    *   As the Raycast API evolves, we'll take advantage of new features to make the language switching more seamless
    *   Potential implementation of automatic language detection based on system settings

## Branding

We're using a custom SonarQube icon in the `assets` directory that maintains the SonarQube brand identity while fitting Raycast's UI guidelines.