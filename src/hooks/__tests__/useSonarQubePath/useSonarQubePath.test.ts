import { useSonarQubePath } from "../../useSonarQubePath";
import { getPreferenceValues, showToast, openExtensionPreferences, Toast } from "@raycast/api";

// Mock Raycast API
jest.mock("@raycast/api", () => ({
  getPreferenceValues: jest.fn(),
  showToast: jest.fn(),
  openExtensionPreferences: jest.fn(),
  Toast: {
    Style: {
      Failure: "failure",
      Success: "success",
      Animated: "animated",
    },
  },
}));

// Mock React hooks
const mockSetPathError = jest.fn();
jest.mock("react", () => ({
  useState: jest.fn(() => [null, mockSetPathError]),
}));

describe("useSonarQubePath", () => {
  const mockShowToast = showToast as jest.Mock;
  const mockOpenExtensionPreferences = openExtensionPreferences as jest.Mock;
  let hook: ReturnType<typeof useSonarQubePath>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockShowToast.mockResolvedValue({
      hide: jest.fn(),
    });

    // Set default preferences mock
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: false,
    });

    // Initialize the hook
    hook = useSonarQubePath();
  });

  it("should return default URL when not using custom app", async () => {
    // Mock preferences
    (getPreferenceValues as jest.Mock).mockReturnValueOnce({
      useCustomSonarQubeApp: false,
    });

    const path = await hook.getSonarQubePath();

    expect(path).toBe("http://localhost:9000");
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("should return custom path when using custom app", async () => {
    // Create a new hook instance with the custom path mock
    const customPath = "/Applications/SonarQube.app";
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: customPath,
    });

    // Re-initialize hook with new mock
    hook = useSonarQubePath();

    const path = await hook.getSonarQubePath();

    expect(path).toBe(customPath);
    expect(mockShowToast).not.toHaveBeenCalled();
  });

  it("should show error when custom path is missing", async () => {
    // Create a new hook instance with missing path mock
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    // Re-initialize hook with new mock
    hook = useSonarQubePath();

    const path = await hook.getSonarQubePath();

    expect(path).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      expect.objectContaining({
        style: Toast.Style.Failure,
      }),
    );
    expect(mockSetPathError).toHaveBeenCalled();
  });

  it("should open preferences when action is triggered", async () => {
    // Create a new hook instance with missing path mock
    (getPreferenceValues as jest.Mock).mockReturnValue({
      useCustomSonarQubeApp: true,
      sonarqubeAppPath: "",
    });

    // Re-initialize hook with new mock
    hook = useSonarQubePath();

    // Mock toast with action
    const mockHide = jest.fn();
    mockShowToast.mockResolvedValue({
      hide: mockHide,
    });

    await hook.getSonarQubePath();

    // Get the primary action from the toast
    const toastOptions = mockShowToast.mock.calls[0][0];
    await toastOptions.primaryAction.onAction({ hide: mockHide });

    expect(mockOpenExtensionPreferences).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
  });
});
