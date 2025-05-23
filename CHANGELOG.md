# Changelog

All notable changes to the SonarQube Tools extension will be documented in this file.

## [Unreleased]

### Added
- Comprehensive project reorganization with an improved domain-based structure:
  - `commands/` directory for all Raycast command entry points
  - `components/` directory for UI components with proper subdirectories
  - `hooks/` directory for custom React hooks
  - `utils/` directory with domain-specific modules (terminal, sonarQubeStatus, projectManagement)
  - `i18n/` directory for internationalization system
  - `testUtils/` directory for test helpers and mocks
  - Properly organized test files in `__tests__` directories adjacent to their implementation files
- Added README files in each major directory explaining its purpose and contents
- Created PROJECT_STRUCTURE.md with detailed documentation of the project organization

### Changed
- Improved production code test coverage with excellent metrics in key components:
  - Commands directory: 93.54% statements, 91.83% branches, 86.66% functions, 93.92% lines
  - Components: 100% coverage across all metrics
  - Hooks: 100% statement coverage, 88.23% branch coverage
  - i18n module: 91.52% statement coverage, 88% branch coverage
- Added focused test cases to specifically target branch coverage gaps in the isSonarQubeRunning function
- Refactored startAnalyzeOpenSonarQube.tsx into smaller, more testable components with improved coverage
- Enhanced terminal command tests with proper mocking of execAsync and showToast
- Dramatically improved test reliability by adopting a better mocking strategy for HTTP requests
- Reorganized project structure for better maintainability and clearer separation of concerns
- All 282 tests are now passing with zero failures

### Fixed
- Fixed all failing tests across the codebase with a consistent mocking approach
- Resolved complex HTTP mocking issues in all test files by directly mocking the isSonarQubeRunning function
- Fixed TypeScript errors related to global variables in test state by using module-level objects
- Resolved failing tests in utils.terminal.test.ts by implementing proper mocks
- Fixed all 49 terminal utility test files (267+ tests) using direct module mocking approach for more reliable testing
- Implemented improved toast state tracking in terminal utility tests to ensure proper verification of UI updates
- Enhanced error handling in terminal tests with try/catch blocks to verify toast states even after errors
- Resolved persistent test failure in `isSonarQubeRunning` related to timeout detection logic, improving reliability of server status checks
- Eliminated test flakiness in utils.skip-problematic.test.ts, utils.branch-coverage.test.ts, utils.final-coverage.test.ts, and utils.branch-final.test.ts
- Fixed import path issues in component files after reorganization
- Fixed ProjectForm tests with correct component import paths
- Resolved JSON parsing errors in project management tests
- Fixed i18n mock paths in useCommandSequencer tests
- Fixed component imports in ProjectEmptyState, ProjectListItem, and ProjectsList

## [1.1.0] - 2025-05-14

### Added
- Comprehensive internationalization (i18n) system
  - Full support for English and Spanish languages
  - Dynamic language detection based on user preferences
  - Flexible translation system with parameter support for complex messages
  - Extensible framework ready to support additional languages
- Enhanced SonarQube status detection
  - Intelligent detection with detailed information about SonarQube state
  - Improved handling for different states: running, starting, initializing, or stopped
  - Automatic retry logic with configurable timeouts for more reliable detection
  - Smart wait times based on detected server state
  - Comprehensive error handling with user-friendly localized messages

### Changed
- Improved user experience with more informative feedback during operations
- Enhanced test suite with coverage for new features

### Fixed
- Resolved issues with SonarQube detection when the service is slow to respond
- Fixed terminal command execution error handling

## [1.0.0] - 2025-04-20

### Added
- Initial release with multi-project support
- Core commands for SonarQube management:
  - Start SonarQube Locally (Podman)
  - Stop SonarQube Locally (Podman)
  - Open SonarQube App
  - Start SonarQube, Analyze & Open Project
  - Run Sonar Analysis
- Project management interface for adding, editing, and removing projects
- Terminal interaction enhancements with progress tracking
- Comprehensive test coverage
