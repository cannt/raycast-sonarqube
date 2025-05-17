/// <reference types="jest" />

// Mock Raycast API
const mockGetPreferenceValues = jest.fn();
jest.mock("@raycast/api", () => ({
  getPreferenceValues: mockGetPreferenceValues,
}));

// Import translations for test validation
import en from '../translations/en';
import es from '../translations/es';

// Don't mock the i18n module, we want to test the real implementation
jest.unmock('../index');
import i18n from '../index';

// Mock console.error to avoid noise in test output
jest.spyOn(console, "error").mockImplementation(() => {});

// Mock Intl.DateTimeFormat for system language detection tests
const originalIntl = global.Intl;



describe("i18n utils", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset preference values mock for each test
    mockGetPreferenceValues.mockReset();
    
    // Reset console.error spy
    jest.spyOn(console, "error").mockImplementation(() => {});
    
    // Reset Intl mock if needed
    global.Intl = originalIntl;
  });

  describe("getLanguage", () => {
    it("returns language from user preferences if set and supported", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "es" });
      expect(i18n.getLanguage()).toBe("es");
    });

    it("returns English if preference language is not supported", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "fr" }); // Not supported
      expect(i18n.getLanguage()).toBe("en");
    });

    it("returns English if preference is not set", () => {
      mockGetPreferenceValues.mockReturnValue({ language: undefined });
      expect(i18n.getLanguage()).toBe("en");
    });
    
    it("tries to detect system language when no preference is set", () => {
      // Mock empty preferences
      mockGetPreferenceValues.mockReturnValue({});
      
      // Mock system language to Spanish
      global.Intl = {
        DateTimeFormat: () => ({
          resolvedOptions: () => ({
            locale: "es-ES"
          })
        })
      } as any;
      
      expect(i18n.getLanguage()).toBe("es");
    });

    it("handles errors gracefully and returns English as fallback", () => {
      mockGetPreferenceValues.mockImplementation(() => {
        throw new Error("Test error");
      });
      expect(i18n.getLanguage()).toBe("en");
      expect(console.error).toHaveBeenCalled();
      
      // Clean up
    });
  });

  describe("t function", () => {
    it("returns translation for a given key", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      expect(i18n.t("common.success")).toBe("Success");

    });
    
    it("returns SonarQube status detection translations for English", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      expect(i18n.t("commands.startSonarQube.pleaseWait")).toBe("SonarQube is starting up, please wait a moment");
      expect(i18n.t("commands.startSonarQube.checkingStatus")).toBe("Checking SonarQube status...");
      expect(i18n.t("commands.startSonarQube.initializing")).toBe("SonarQube might be initializing. Checking again with longer timeout...");

    });
    
    it("returns SonarQube status detection translations for Spanish", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "es" });
      expect(i18n.t("commands.startSonarQube.pleaseWait")).toBe("SonarQube está iniciándose, por favor espera un momento");
      expect(i18n.t("commands.startSonarQube.checkingStatus")).toBe("Comprobando el estado de SonarQube...");
      expect(i18n.t("commands.startSonarQube.initializing")).toBe("SonarQube podría estar inicializándose. Comprobando de nuevo con mayor tiempo de espera...");

    });

    it("returns the key itself if translation not found", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      expect(i18n.t("nonexistent.key")).toBe("nonexistent.key");

    });

    it("replaces parameters in the translation", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      expect(i18n.t("terminal.executing", { command: "test" })).toBe("Executing: test");

    });

    it("falls back to English if key not found in selected language", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "es" });
      
      // Create a custom key that exists only in English translations
      // We'll inject this temporarily just for testing the fallback mechanism
      const tempKey = "test.english.only.key";
      const tempValue = "This is an English-only value";
      
      // Add the temporary key to English translations
      const origEn = { ...en };
      (en as any).test = { english: { only: { key: tempValue } } };
      
      // Test that using Spanish still gives us the English value for this key
      const result = i18n.t(tempKey);
      expect(result).toBe(tempValue);
      
      // Clean up our test key
      Object.assign(en, origEn);

    });

    // Test that the function handles gracefully incorrect inputs
    it("handles invalid inputs gracefully", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      
      // Try with various invalid inputs
      expect(i18n.t("")).toBe("");
      expect(i18n.t(null as any)).toBe(null as any);
      expect(i18n.t(undefined as any)).toBe(undefined as any);
      
      // Try a deeply nested key that doesn't exist
      const complexKey = "a.very.deep.nested.key.that.does.not.exist";
      expect(i18n.t(complexKey)).toBe(complexKey);
    });
    
    it("handles errors gracefully in the translation process", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      
      // Create a faulty translation object by temporarily modifying it
      const original = { ...en };
      Object.defineProperty(en, "common", {
        get: function() {
          throw new Error("Simulated error in translation process");
        }
      });
      
      // Now trying to access a key under "common" should throw an error
      // that will be caught by the error handling in the t function
      const result = i18n.t("common.success");
      
      // The function should return the original key rather than throwing
      expect(result).toBe("common.success");
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining("Error translating key: common.success"),
        expect.any(Error)
      );
      
      // Restore the original object to avoid affecting other tests
      Object.defineProperty(en, "common", {
        value: original.common,
        writable: true,
        configurable: true
      });
    });
    
    it("handles errors when getting language", () => {
      // Mock getPreferenceValues to throw an error
      mockGetPreferenceValues.mockImplementation(() => {
        throw new Error("Test error in getPreferenceValues");
      });
      
      // Spy on console.error
      const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      
      // Call the function with a known key
      const result = i18n.t("common.success");
      
      // Should handle the error and still return something (the English value)
      expect(result).toBe("Success"); // English fallback should work
      
      // Verify error was logged
      expect(errorSpy).toHaveBeenCalled();
    });
    
    it("verifies that __ is an alias for t", () => {
      mockGetPreferenceValues.mockReturnValue({ language: "en" });
      
      // Check if __ returns the same as t
      const key = "common.success";
      expect(i18n.__(key)).toBe(i18n.t(key));
      expect(i18n.__(key)).toBe("Success");
    });
  });
  
  describe("i18n object", () => {
    it("provides access to all translation functions", () => {
      // Verify the exported i18n object has all required functions
      expect(typeof i18n.t).toBe('function');
      expect(typeof i18n.__).toBe('function');
      expect(typeof i18n.getLanguage).toBe('function');
    });
  });
});
