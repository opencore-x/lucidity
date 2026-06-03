import * as React from 'react';
import { Button, HStack, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, tint, opacity, lineLimit } from '@expo/ui/swift-ui/modifiers';

/**
 * Shared glass segmented-toggle button (e.g. Active / Completed / Deferred). Matches the
 * small glass filter pills used on the Milestones list screen: `controlSize('small')`,
 * `glassProminent` when selected (tinted to `tintColor`), plain `glass` otherwise. The
 * count rides alongside the label as a muted inline number (dimmed via `opacity` so it
 * adapts to both the glass and prominent backgrounds). Use this for every such toggle so
 * they share one size + style.
 */
export function SegmentTab({
  label,
  count,
  selected,
  onPress,
  tintColor,
}: {
  label: string;
  count: number;
  selected: boolean;
  onPress: () => void;
  tintColor?: string | null;
}) {
  return (
    <Button
      onPress={onPress}
      modifiers={[
        controlSize('small'),
        buttonStyle(selected ? 'glassProminent' : 'glass'),
        ...(tintColor ? [tint(tintColor)] : []),
      ]}>
      <HStack spacing={5}>
        <Text modifiers={[lineLimit(1)]}>{label}</Text>
        <Text modifiers={[opacity(0.55), lineLimit(1)]}>{String(count)}</Text>
      </HStack>
    </Button>
  );
}
