/**
 * Common mock implementation for @raycast/api
 * Use this in tests to ensure consistent mocking behavior
 */

// Create mock toast tracking object
export const mockToast = {
  style: null as string | null,
  title: null as string | null,
  message: null as string | null,
};

// Export mock functions and objects
export const Toast = {
  Style: {
    Animated: "animated",
    Success: "success",
    Failure: "failure",
  },
};

export const showToast = jest.fn().mockImplementation((props: any) => {
  // Update our tracking object
  mockToast.style = props.style;
  mockToast.title = props.title;
  mockToast.message = props.message || "";

  // Return an object with updatable properties
  return {
    // Use getter functions instead of direct properties to avoid conflicts with setters
    get styleValue() {
      return props.style;
    },
    get titleValue() {
      return props.title;
    },
    get messageValue() {
      return props.message;
    },

    // Allow properties to be updated with setters
    set style(value: string) {
      mockToast.style = value;
    },
    set title(value: string) {
      mockToast.title = value;
    },
    set message(value: string) {
      mockToast.message = value;
    },
  };
});

// Mock LocalStorage
export const LocalStorage = {
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
  clear: jest.fn().mockResolvedValue(undefined),
  allItems: jest.fn().mockResolvedValue({}),
};

// Other common Raycast API exports
export const getPreferenceValues = jest.fn().mockReturnValue({
  sonarqubePath: "/mock/sonarqube/path",
  podmanEnabled: true,
});

export const openExtensionPreferences = jest.fn();

// Helper to reset all mocks
export function resetRaycastMocks() {
  mockToast.style = null;
  mockToast.title = null;
  mockToast.message = null;

  showToast.mockClear();
  getPreferenceValues.mockClear();
  openExtensionPreferences.mockClear();

  Object.values(LocalStorage).forEach((mock) => mock.mockClear && mock.mockClear());
}

// For test verification
export function _getMockToast() {
  return mockToast;
}
