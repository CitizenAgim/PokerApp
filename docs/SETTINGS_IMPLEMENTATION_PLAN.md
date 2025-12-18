# Implementation Plan: Settings Page Enhancements

## 1. Update Data Layer (`services/localStorage.ts`)
- Update `UserPreferences` interface to include:
  - `language`: 'en' (default)
  - `currency`: 'EUR' | 'USD' | 'GBP' (default 'USD')
  - `country`: string (default 'US')
  - `dateFormat`: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD' (default 'MM/DD/YYYY')
  - `timeFormat`: '12h' | '24h' (default '12h')
- Update `DEFAULT_PREFERENCES` with these new defaults.

## 2. Update State Management (`contexts/SettingsContext.tsx`)
- Update `SettingsContextType` interface to include the new settings and their setters.
- Update `SettingsProvider` to:
  - Initialize state for new settings.
  - Load these settings from `localStorage` in `loadSettings`.
  - Create setter functions (`setLanguage`, `setCurrency`, etc.) that update state and persist to `localStorage`.
- Expose these new values and functions in the context provider.

## 3. Update Hooks (`hooks/useSettings.ts`)
- Ensure `useSettings` hook exports the new context values (it likely just re-exports the context, but good to verify).

## 4. Implement Settings UI (`app/(main)/settings.tsx`)
- Create a comprehensive settings screen with sections:
  - **General**: Language (Dropdown - English only for now), Country (Picker/Input).
  - **Appearance**: Theme Mode (Moved from Profile), Ninja Mode (Already exists, maybe move here too or keep in both?). *Instruction says move theme mode, doesn't explicitly say move Ninja mode but it makes sense to have it here.*
  - **Currency & Formats**: Currency (Dropdown), Date Format (Dropdown), Time Format (Switch/Dropdown).
- Use `useSettings` to get and set values.
- Use `useColorScheme` for theming the settings page itself.

## 5. Update Profile Page (`app/(main)/profile.tsx`)
- Remove the "App Theme" selection section.
- Keep the link to the Settings page.

## 6. Verification
- Verify that changing settings persists after reload.
- Verify that the theme change still works from the new location.
- Verify that the default values are correct for new users.

## Questions
- Should "Ninja Mode" also be moved to Settings, or kept in Profile? (I will duplicate it or move it to Settings as it fits better there, but keep the toggle in Profile if it's a quick action). *Decision: I'll add it to Settings as well, but maybe leave it in Profile if it's considered a "quick toggle". The prompt specifically asked to "move the theme mode", implying a transfer. I will move Theme Mode. I will add the others to Settings.*
- For "Country", should I use a library or just a simple text input/dropdown? *Decision: I'll use a simple text input or a limited dropdown for now to avoid adding heavy dependencies unless requested.*
