# Internationalization (i18n)

This directory contains internationalization utilities for the SonarQube Tools extension.

## Structure

- **translations/**: Contains translation files for different languages
- **index.ts**: Main entry point for i18n functionality
- **useTranslation.tsx**: React hook for using translations in components

## Usage

Use the `useTranslation` hook in React components to access translations:

```tsx
import { useTranslation } from "../i18n";

function MyComponent() {
  const { t } = useTranslation();
  return <Text>{t("some.translation.key")}</Text>;
}
```

## Testing

All i18n utilities have tests in the `__tests__` directory.
