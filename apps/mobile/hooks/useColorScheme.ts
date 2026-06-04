import * as React from 'react';
import { Appearance } from 'react-native';

import { COLORS } from '@/lib/theme';

export type ColorScheme = 'light' | 'dark';

/**
 * Reliable color-scheme source, replacing NativeWind's `useColorScheme` (whose
 * 5.0-preview hook could report `light`/`undefined` on first render — the cause of
 * the dark-mode text washout in the note viewer, see task #192).
 *
 * The effective scheme is a module-level manual override (set by the in-app theme
 * toggle) falling back to the system appearance via React Native's `Appearance`.
 * The override is in-memory only, so it resets to the system setting on cold start
 * (matching the prior behavior). `useSyncExternalStore` keeps every subscriber in
 * lockstep with both the override and live system-appearance changes.
 */
let override: ColorScheme | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function getSnapshot(): ColorScheme {
  if (override) return override;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function subscribe(onChange: () => void) {
  listeners.add(onChange);
  const sub = Appearance.addChangeListener(emit);
  return () => {
    listeners.delete(onChange);
    sub.remove();
  };
}

/** Set the manual theme override and keep the native UIKit appearance in lockstep. */
export function setColorScheme(scheme: ColorScheme) {
  override = scheme;
  Appearance.setColorScheme(scheme);
  emit();
}

/** Drop the manual override and follow the system appearance again. */
export function clearColorSchemeOverride() {
  override = null;
  Appearance.setColorScheme('unspecified');
  emit();
}

/**
 * Same shape NativeWind exposed (`{ colorScheme, setColorScheme }`) so call sites
 * needed no signature change — but `colorScheme` is always `'light' | 'dark'`.
 */
export function useColorScheme() {
  const colorScheme = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return { colorScheme, setColorScheme };
}

/** Theme colors (hex) for the active scheme. */
export function useThemeColors() {
  const { colorScheme } = useColorScheme();
  return COLORS[colorScheme];
}
