/**
 * Type declarations for the mocked @raycast/api module
 * This makes TypeScript happy when tests import from @raycast/api
 */

declare module "@raycast/api" {
  // Toast API
  export const Toast: {
    Style: {
      Success: string;
      Failure: string;
      Animated: string;
    };
  };

  export function showToast(props: { style?: string; title?: string; message?: string }): {
    style: string;
    title: string;
    message: string;
  };

  // Preferences API
  export function getPreferenceValues<T = any>(): T;
  export function openExtensionPreferences(): Promise<void>;

  // Navigation API
  export function open(target: string): Promise<void>;
  export function useNavigation(): { push: (component: any) => void };

  // UI Components
  export const List: any;
  export const ActionPanel: any;
  export const Action: any;
  export const Icon: any;
  export const Form: any;
  export const Keyboard: any;

  // Utilities
  export function confirmAlert(options: any): Promise<boolean>;
  export const LocalStorage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
    clear(): Promise<void>;
    allItems(): Promise<Record<string, string>>;
  };

  // Test utilities (not in real Raycast API, but added for testing)
  export function _getMockToast(): {
    style: string | null;
    title: string | null;
    message: string | null;
  };
}
