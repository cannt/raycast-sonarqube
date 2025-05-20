/**
 * Type extensions for Raycast API to fix TypeScript issues with Toast
 */
import "@raycast/api";

declare module "@raycast/api" {
  interface ToastOptions {
    primaryAction?: {
      title: string;
      onAction: (toast: Toast) => void | Promise<void>;
    };
  }
  
  interface Toast {
    hide: () => void;
    show: () => void;
  }
}
