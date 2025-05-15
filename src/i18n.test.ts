import { __ } from "./i18n";
import enTranslations from "./i18n/translations/en";
import esTranslations from "./i18n/translations/es";

// Mock the preferences API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn().mockReturnValue({ language: "en" })
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
    expect(__('errors.generic')).toBe(enTranslations.errors.generic);
    
    // Check the sonarqube status translations are available
    expect(__('commands.startSonarQube.alreadyRunning')).toBe(enTranslations.commands.startSonarQube.alreadyRunning);
    expect(__('commands.startSonarQube.starting')).toBe(enTranslations.commands.startSonarQube.starting);
    expect(__('commands.startSonarQube.waiting')).toBe(enTranslations.commands.startSonarQube.waiting);
  });

  it("should translate keys correctly in Spanish", () => {
    const getPreferenceValues = require("@raycast/api").getPreferenceValues;
    getPreferenceValues.mockReturnValue({ language: "es" });
    
    // Test some key translations
    expect(__("commands.startSonarQube.title")).toBe(esTranslations.commands.startSonarQube.title);
    expect(__("commands.runSonarAnalysis.title")).toBe(esTranslations.commands.runSonarAnalysis.title);
    
    // Test standard error keys
    expect(__('errors.generic')).toBe(esTranslations.errors.generic);
    
    // Check the sonarqube status translations are available
    expect(__('commands.startSonarQube.alreadyRunning')).toBe(esTranslations.commands.startSonarQube.alreadyRunning);
    expect(__('commands.startSonarQube.starting')).toBe(esTranslations.commands.startSonarQube.starting);
    expect(__('commands.startSonarQube.waiting')).toBe(esTranslations.commands.startSonarQube.waiting);
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
