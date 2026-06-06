import * as React from 'react';
import { HStack, Text } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  glassEffect,
  contentShape,
  shapes,
  onTapGesture,
  opacity,
} from '@expo/ui/swift-ui/modifiers';

/**
 * A small glass-capsule pill with a text label (no icon) — the glass cousin of the
 * task-row metadata chips. With `onPress` it's a tappable action (Read more / Read less /
 * Edit); without it, a static glass label (e.g. the Today section headers). An optional
 * `count` rides alongside the label as a muted inline number (dimmed via `opacity`).
 */
export function PillButton({
  label,
  count,
  color,
  weight,
  onPress,
}: {
  label: string;
  count?: number;
  color?: string;
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
  onPress?: () => void;
}) {
  const labelMods = [
    font({ size: 13, ...(weight ? { weight } : {}) }),
    ...(color ? [foregroundStyle(color)] : []),
  ];
  const containerMods = [
    padding({ horizontal: 12, vertical: 6 }),
    glassEffect({ glass: { variant: 'regular', interactive: !!onPress }, shape: 'capsule' }),
    ...(onPress ? [contentShape(shapes.capsule()), onTapGesture(onPress)] : []),
  ];

  if (count != null) {
    return (
      <HStack spacing={5} modifiers={containerMods}>
        <Text modifiers={labelMods}>{label}</Text>
        <Text modifiers={[...labelMods, opacity(0.55)]}>{String(count)}</Text>
      </HStack>
    );
  }

  return <Text modifiers={[...labelMods, ...containerMods]}>{label}</Text>;
}
