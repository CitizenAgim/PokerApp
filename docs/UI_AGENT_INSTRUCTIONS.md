# UI Development Guidelines

This document serves as the **source of truth** for all UI development in the PokerApp project. All AI agents and developers must adhere to these guidelines to ensure consistency, maintainability, and visual quality.

## 1. Styling Architecture

**CRITICAL:** We strictly enforce a separation of concerns between component logic and styling.

### File Structure
*   **Never** define `StyleSheet.create(...)` inside the main component file.
*   Create a sibling file for styles with the `.styles.ts` extension.
*   **Naming Convention:**
    *   **Components:** `ComponentName.tsx` → `ComponentName.styles.ts`
    *   **App Routes:** `route-name.tsx` → `_route-name.styles.ts` (Prefix with `_` to prevent Expo Router from treating it as a route).

### Pattern Implementation
Every style file must export two things:
1.  `getThemeColors(isDark: boolean)`: A function returning an object of dynamic colors.
2.  `styles`: The static `StyleSheet` object.

**Example (`MyComponent.styles.ts`):**
```typescript
import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000000' : '#FFFFFF',
  text: isDark ? '#FFFFFF' : '#000000',
  accent: '#0a7ea4',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
});
```

**Example Usage (`MyComponent.tsx`):**
```typescript
import { useColorScheme } from '@/hooks/use-color-scheme';
import { View, Text } from 'react-native';
import { getThemeColors, styles } from './MyComponent.styles';

export function MyComponent() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Hello World</Text>
    </View>
  );
}
```

---

## 2. Theming & Dark Mode

**Requirement:** Every UI component **must** adapt seamlessly to both Light and Dark modes.

*   **No Hardcoded Colors:** Never use raw hex codes (e.g., `#FFFFFF`) directly in the component's JSX or inline styles for theme-dependent properties.
*   **Use the Helper:** Always retrieve colors via the `getThemeColors(isDark)` helper defined in the style file.
*   **Standard Palette:** Prefer using semantic names in your color object (e.g., `background`, `textPrimary`, `border`, `cardBg`) rather than descriptive names (e.g., `white`, `black`, `gray`).

---

## 3. Responsive Design & Relative Proportions

**Requirement:** The app must render correctly on **all** device sizes (from iPhone SE to large tablets) and orientations.

### Guidelines:

1.  **Relative Dimensions:**
    *   **Avoid** fixed pixel values for structural containers (e.g., `width: 300`).
    *   **Use** percentages (e.g., `width: '90%'`) or Flexbox (`flex: 1`).

2.  **Screen-Relative Sizing:**
    *   Use `Dimensions.get('window')` or `useWindowDimensions()` for elements that need to scale with the screen.
    *   Example: `const CARD_WIDTH = width * 0.25;` (25% of screen width).

3.  **Flexbox First:**
    *   Use Flexbox for layout (`justifyContent`, `alignItems`) to distribute space dynamically.
    *   Use `gap` for spacing between items instead of fixed margins where possible.

4.  **Safe Areas:**
    *   Always wrap top-level screen content in `SafeAreaView` or use `useSafeAreaInsets` to handle notches and home indicators.

5.  **Touch Targets:**
    *   Ensure interactive elements have a minimum hit slop or size (min 44x44 points) regardless of the screen density.

---

## 4. Checklist for New UI Code

Before marking a task as complete, verify:
- [ ] Is the styling separated into a `*.styles.ts` file?
- [ ] Does the style file export `getThemeColors`?
- [ ] Does the component look correct in Dark Mode?
- [ ] Does the component look correct in Light Mode?
- [ ] Does the layout break on a small screen?
- [ ] Are there any hardcoded dimensions that should be relative?

