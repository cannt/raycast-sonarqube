# Changelog

All notable changes to the SonarQube Tools extension will be documented in this file.

## [Unreleased]

### Fixed
- Resolved persistent test failure in `isSonarQubeRunning` related to timeout detection logic, improving reliability of server status checks.

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
