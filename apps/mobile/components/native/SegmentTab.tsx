import * as React from 'react';
import { Button, HStack, Image, Text } from '@expo/ui/swift-ui';
import { buttonStyle, controlSize, tint, font } from '@expo/ui/swift-ui/modifiers';

type SystemName = React.ComponentProps<typeof Image>['systemName'];

/**
 * Shared glass segmented-toggle button (e.g. Active / Completed). The count renders
 * as a native SF Symbol number-in-circle (`N.circle.fill`); SF Symbols only cover
 * 0–50, so larger counts fall back to a plain number. `glassProminent` when selected,
 * tinted to `tintColor`. Use this for every Active/Completed toggle so they share one
 * size + style.
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
        controlSize('regular'),
        buttonStyle(selected ? 'glassProminent' : 'glass'),
        ...(tintColor ? [tint(tintColor)] : []),
      ]}>
      <HStack spacing={6}>
        <Text>{label}</Text>
        {count >= 0 && count <= 50 ? (
          <Image systemName={`${count}.circle.fill` as SystemName} size={26} />
        ) : (
          <Text modifiers={[font({ size: 20, weight: 'semibold' })]}>{String(count)}</Text>
        )}
      </HStack>
    </Button>
  );
}
