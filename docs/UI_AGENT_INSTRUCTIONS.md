# UI Development Guidelines

## Responsive Design & Relative Proportions

**CRITICAL INSTRUCTION FOR ALL FUTURE UI CHANGES:**

When implementing or modifying UI components in this project, you **MUST** ensure that all dimensions, positioning, and layouts are **relative** rather than fixed. This is essential to guarantee that the application functions correctly and looks good across all device sizes (phones, tablets) and screen densities.

### Guidelines:

1.  **Avoid Hardcoded Dimensions:**
    *   Do not use fixed pixel values for container widths or heights (e.g., `width: 300`, `height: 500`) unless absolutely necessary for small, fixed-size elements like icons.
    *   Instead, use percentages (e.g., `width: '90%'`) or Flexbox properties (e.g., `flex: 1`).

2.  **Use Screen Dimensions:**
    *   Utilize `Dimensions.get('window')` or `useWindowDimensions()` to calculate sizes dynamically based on the current device's screen size.
    *   Example:
        ```typescript
        const { width, height } = Dimensions.get('window');
        const TABLE_WIDTH = width * 0.8; // 80% of screen width
        const TABLE_HEIGHT = height * 0.5; // 50% of screen height
        ```

3.  **Flexbox Layouts:**
    *   Prioritize Flexbox for layout structure (`justifyContent`, `alignItems`, `flexDirection`).
    *   Use `flexGrow`, `flexShrink`, and `flexBasis` to manage how elements consume available space.

4.  **Safe Area Handling:**
    *   Always use `SafeAreaView` or `useSafeAreaInsets` from `react-native-safe-area-context` to ensure content is not obscured by notches, status bars, or home indicators.

5.  **Testing:**
    *   Consider how the layout will appear on small devices (e.g., iPhone SE) versus large devices (e.g., iPhone Pro Max, Pixel XL).
    *   Ensure touch targets (buttons, inputs) remain accessible and are not crowded on smaller screens.

### Specific Context: Poker Table Layout

For the Poker Table component (and similar complex layouts):
*   The table dimensions and seat positioning should scale based on the available screen width/height.
*   Do not hardcode `TABLE_WIDTH = 200` if it might be too small on a tablet or too large on a mini phone. Calculate it as a fraction of the screen width.
