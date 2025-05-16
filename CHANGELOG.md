# Changelog

All notable changes to the SonarQube Tools extension will be documented in this file.

## [Unreleased]

### Changed
- Improved test coverage from 88.3% to 91.03% for statements, from 88.22% to 91.01% for lines, and from 88.57% to 91.42% for functions
- Completed implementation of previously skipped tests for utils.ts, increasing overall branch coverage from 74.86% to 78.77%
- Added focused test cases to specifically target branch coverage gaps in the isSonarQubeRunning function
- Refactored startAnalyzeOpenSonarQube.tsx into smaller, more testable components with improved coverage (100% statement coverage, 88.88% branch coverage)
- Enhanced terminal command tests with proper mocking of execAsync and showToast
- Dramatically improved test reliability by adopting a better mocking strategy for HTTP requests

### Fixed
- Fixed all failing tests across the codebase with a consistent mocking approach
- Resolved complex HTTP mocking issues in all test files by directly mocking the isSonarQubeRunning function
- Fixed TypeScript errors related to global variables in test state by using module-level objects
- Resolved failing tests in utils.terminal.test.ts by implementing proper mocks
- Resolved persistent test failure in `isSonarQubeRunning` related to timeout detection logic, improving reliability of server status checks
- Eliminated test flakiness in utils.skip-problematic.test.ts, utils.branch-coverage.test.ts, utils.final-coverage.test.ts, and utils.branch-final.test.ts

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
