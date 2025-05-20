/**
 * Type declaration augmentations for test mocks
 */

// Declare the extended API for testing
declare module '@raycast/api' {
  // Extend the @raycast/api module with test utility functions
  export function _getMockToast(): {
    style: string | null;
    title: string | null;
    message: string | null;
  };
}
