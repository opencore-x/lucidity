import * as React from 'react';
import { Text } from '@expo/ui/swift-ui';
import {
  font,
  foregroundStyle,
  padding,
  glassEffect,
  contentShape,
  shapes,
  onTapGesture,
} from '@expo/ui/swift-ui/modifiers';

/**
 * A small tappable glass-capsule pill with a text label (no icon) — the interactive
 * cousin of the task-row metadata chips. Used for compact inline actions such as
 * Read more / Read less / Edit.
 */
export function PillButton({
  label,
  color,
  onPress,
}: {
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Text
      modifiers={[
        font({ size: 13 }),
        ...(color ? [foregroundStyle(color)] : []),
        padding({ horizontal: 12, vertical: 6 }),
        glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'capsule' }),
        contentShape(shapes.capsule()),
        onTapGesture(onPress),
      ]}>
      {label}
    </Text>
  );
}
