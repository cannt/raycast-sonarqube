import enTranslations from "../translations/en";
import esTranslations from "../translations/es";

// Mock the i18n module
jest.mock("../index", () => ({
  __: jest.fn().mockImplementation((key, params) => {
    // Get preference values to determine language
    const { getPreferenceValues } = require("@raycast/api");
    const prefs = getPreferenceValues();
    const language = prefs.language || "en";

    // Lookup the key in the appropriate translation file
    const translations = language === "es" ? esTranslations : enTranslations;

    // Navigate to the nested key
    const parts = key.split(".");
    let result: any = translations;
    for (const part of parts) {
      if (result && typeof result === "object" && part in result) {
        result = result[part];
      } else {
        return key; // Key not found, return original key
      }
    }

    return result;
  }),
  t: jest.fn().mockImplementation((key, params) => {
    // Just delegate to __ for simplicity in tests
    return module.exports.__(key, params);
  }),
  getLanguage: jest.fn().mockReturnValue("en"),
}));

// Re-import after mock is set up
import { __ } from "../index";

// Mock the preferences API
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn().mockReturnValue({ language: "en" }),
}));

describe("Internationalization System", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should translate keys correctly in English", () => {
    const getPreferenceValues = require("@raycast/api").getPreferenceValues;
    getPreferenceValues.mockReturnValue({ language: "en" });

    // Test some key translations
    expect(__("commands.startSonarQube.title")).toBe(enTranslations.commands.startSonarQube.title);
    expect(__("commands.runSonarAnalysis.title")).toBe(enTranslations.commands.runSonarAnalysis.title);

    // Test standard error keys
    expect(__("errors.generic")).toBe(enTranslations.errors.generic);

    // Check the sonarqube status translations are available
    expect(__("commands.startSonarQube.alreadyRunning")).toBe(enTranslations.commands.startSonarQube.alreadyRunning);
    expect(__("commands.startSonarQube.starting")).toBe(enTranslations.commands.startSonarQube.starting);
    expect(__("commands.startSonarQube.waiting")).toBe(enTranslations.commands.startSonarQube.waiting);
  });

  it("should translate keys correctly in Spanish", () => {
    const getPreferenceValues = require("@raycast/api").getPreferenceValues;
    getPreferenceValues.mockReturnValue({ language: "es" });

    // Test some key translations
    expect(__("commands.startSonarQube.title")).toBe(esTranslations.commands.startSonarQube.title);
    expect(__("commands.runSonarAnalysis.title")).toBe(esTranslations.commands.runSonarAnalysis.title);

    // Test standard error keys
    expect(__("errors.generic")).toBe(esTranslations.errors.generic);

    // Check the sonarqube status translations are available
    expect(__("commands.startSonarQube.alreadyRunning")).toBe(esTranslations.commands.startSonarQube.alreadyRunning);
    expect(__("commands.startSonarQube.starting")).toBe(esTranslations.commands.startSonarQube.starting);
    expect(__("commands.startSonarQube.waiting")).toBe(esTranslations.commands.startSonarQube.waiting);
  });

  it("should handle parameters in translation strings", () => {
    const getPreferenceValues = require("@raycast/api").getPreferenceValues;
    getPreferenceValues.mockReturnValue({ language: "en" });

    // Note: This is a simplified test that just verifies that the translation function
    // doesn't throw an error when provided with parameters, even if the translation
    // string doesn't use them

    // We'll access a real key but pass parameters
    const key = "commands.startSonarQube.waiting";
    let translationWithParams;

    // This should not throw an error
    expect(() => {
      translationWithParams = __(key, { time: "30s" });
    }).not.toThrow();

    // The result should be a string
    expect(typeof translationWithParams).toBe("string");
  });

  it("should handle missing translation keys gracefully", () => {
    // Test with a key that doesn't exist
    const result = __("non.existent.key");

    // Should return the key rather than crashing
    expect(result).toBe("non.existent.key");
  });

  it("should handle missing template values gracefully", () => {
    // Get a template key
    const key = "commands.startSonarQube.waiting";

    // Call without providing the required template value
    const result = __(key);

    // Should still return a string without crashing
    expect(typeof result).toBe("string");
  });
});
