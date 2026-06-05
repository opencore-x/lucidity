import { StyleSheet } from 'react-native';

/**
 * Shared layout primitives that replace the handful of NativeWind utility classes
 * used app-wide (`flex-1`, `items-center justify-center`, `flex-row items-center
 * gap-2`). Theme-dependent colors (e.g. background) are applied per-screen from
 * `useThemeColors()`, not baked in here.
 */
export const layout = StyleSheet.create({
  flex1: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // Header action buttons (+ and avatar). A wider gap than `row` so the two glass
  // circles stay two distinct buttons instead of morphing into one connected Liquid
  // Glass pill (iOS 26 blends adjacent glass at small distances). Tune the gap here.
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
});
