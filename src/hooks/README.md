# Hooks

This directory contains custom React hooks used throughout the SonarQube Tools extension.

## Available Hooks

- **useCommandSequencer**: Manages sequences of shell commands with proper error handling and progress reporting
- **useProjectLoader**: Manages loading, saving, and manipulating SonarQube project configurations
- **useSonarQubePath**: Provides path information for SonarQube installation based on user preferences

## Testing

Each hook has its own tests in a corresponding `__tests__` subdirectory.
