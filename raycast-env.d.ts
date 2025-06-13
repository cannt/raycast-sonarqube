/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** SonarQube Podman Directory - Directory containing Podman setup for SonarQube. */
  "sonarqubePodmanDir": string,
  /** SonarQube App Path (Optional) - Optional path to a SonarQube application. If specified, this app will be opened instead of the URL. Leave blank to use the URL. */
  "sonarqubeAppPath"?: string,
  /** SonarQube Port (Optional) - Custom port for SonarQube. Default is 9000. Only used when no app path is specified. */
  "sonarqubePort": string,
  /** Language - Interface language for the extension (currently only English is fully supported). */
  "language": "en"
}

/** Preferences accessible in all the extension's commands */
declare type Preferences = ExtensionPreferences

declare namespace Preferences {
  /** Preferences accessible in the `startSonarQube` command */
  export type StartSonarQube = ExtensionPreferences & {}
  /** Preferences accessible in the `stopSonarQube` command */
  export type StopSonarQube = ExtensionPreferences & {}
  /** Preferences accessible in the `openSonarQubeApp` command */
  export type OpenSonarQubeApp = ExtensionPreferences & {}
  /** Preferences accessible in the `runSonarAnalysis` command */
  export type RunSonarAnalysis = ExtensionPreferences & {}
  /** Preferences accessible in the `startAnalyzeOpenSonarQube` command */
  export type StartAnalyzeOpenSonarQube = ExtensionPreferences & {}
  /** Preferences accessible in the `projectManager` command */
  export type ProjectManager = ExtensionPreferences & {}
}

declare namespace Arguments {
  /** Arguments passed to the `startSonarQube` command */
  export type StartSonarQube = {}
  /** Arguments passed to the `stopSonarQube` command */
  export type StopSonarQube = {}
  /** Arguments passed to the `openSonarQubeApp` command */
  export type OpenSonarQubeApp = {}
  /** Arguments passed to the `runSonarAnalysis` command */
  export type RunSonarAnalysis = {}
  /** Arguments passed to the `startAnalyzeOpenSonarQube` command */
  export type StartAnalyzeOpenSonarQube = {}
  /** Arguments passed to the `projectManager` command */
  export type ProjectManager = {}
}

