import { getPreferenceValues, open, showToast, Toast, openExtensionPreferences } from "@raycast/api";
import { openSonarQubeAppLogic } from "../sonarQubeOpener";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  open: jest.fn(),
  showToast: jest.fn(),
  openExtensionPreferences: jest.fn(),
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
    },
  },
}));

// Mock i18n module
jest.mock("../../i18n", () => ({
  __: jest.fn((key) => key), // Return key as translation for testing
}));

// Console error spy
const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

describe("sonarQubeOpener", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default mock preferences
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: false,
    });
  });

  afterAll(() => {
    consoleErrorSpy.mockRestore();
  });

  it("should open default SonarQube URL when custom path is not enabled", async () => {
    // Arrange
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: false,
    });
    
    // Act
    await openSonarQubeAppLogic();
    
    // Assert
    expect(open).toHaveBeenCalledWith("http://localhost:9000");
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "commands.openSonarQubeApp.title",
      message: "commands.openSonarQubeApp.opening http://localhost:9000",
    });
  });
  
  it("should show error when custom path is enabled but not provided", async () => {
    // Arrange
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });
    
    // Mock toast with primaryAction
    const mockToast = {
      hide: jest.fn(),
    };
    let primaryActionCallback: any;
    (showToast as jest.Mock).mockImplementation((options) => {
      if (options.primaryAction && options.primaryAction.onAction) {
        primaryActionCallback = options.primaryAction.onAction;
      }
      return mockToast;
    });
    
    // Act
    await openSonarQubeAppLogic();
    
    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "preferences.useCustomSonarQubeApp.title",
      message: "preferences.sonarqubeAppPath.description",
      primaryAction: {
        title: "preferences.language.title",
        onAction: expect.any(Function),
      },
    });
    expect(open).not.toHaveBeenCalled();
    
    // Test primaryAction callback
    if (primaryActionCallback) {
      await primaryActionCallback(mockToast);
      expect(openExtensionPreferences).toHaveBeenCalled();
      expect(mockToast.hide).toHaveBeenCalled();
    }
  });
  
  it("should open custom SonarQube path when provided", async () => {
    // Arrange
    const customPath = "http://custom.sonarqube:9000";
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: customPath,
    });
    
    // Act
    await openSonarQubeAppLogic();
    
    // Assert
    expect(open).toHaveBeenCalledWith(customPath);
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Success,
      title: "commands.openSonarQubeApp.title",
      message: `commands.openSonarQubeApp.opening ${customPath}`,
    });
  });
  
  it("should handle errors when opening SonarQube fails", async () => {
    // Arrange
    const error = new Error("Failed to open SonarQube");
    (open as jest.Mock).mockRejectedValue(error);
    
    // Act
    await openSonarQubeAppLogic();
    
    // Assert
    expect(showToast).toHaveBeenCalledWith({
      style: Toast.Style.Failure,
      title: "commands.openSonarQubeApp.openError",
      message: error.message,
    });
    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
  });
});
