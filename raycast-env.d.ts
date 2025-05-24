/// <reference types="@raycast/api">

/* 🚧 🚧 🚧
 * This file is auto-generated from the extension's manifest.
 * Do not modify manually. Instead, update the `package.json` file.
 * 🚧 🚧 🚧 */

/* eslint-disable @typescript-eslint/ban-types */

type ExtensionPreferences = {
  /** SonarQube Podman Directory - Directory containing Podman setup for SonarQube. / Directorio con la configuración de Podman para SonarQube. */
  "sonarqubePodmanDir": string,
  /** Use Custom SonarQube Path/URL - If checked, specify a custom SonarQube application path or URL in the field below. Otherwise, http://localhost:9000 will be used. */
  "useCustomSonarQubeApp": boolean,
  /** Custom SonarQube App Path/URL - Path or URL for your SonarQube. Used only if 'Use Custom SonarQube Path/URL' is checked (in extension settings). Can be left blank if not using a custom path. / Ruta o URL para SonarQube. Usado solo si 'Usar Ruta/URL Personalizada de SonarQube' está marcado (en ajustes de extensión). Puede dejarse en blanco si no usa una ruta personalizada. */
  "sonarqubeAppPath": string,
  /** Language / Idioma - Interface language for the extension. If set to 'Auto-detect', will try to use your system language. / Idioma de la interfaz para la extensión. Si se establece en 'Detección automática', se intentará usar el idioma del sistema. */
  "language": "auto" | "en" | "es"
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
}

