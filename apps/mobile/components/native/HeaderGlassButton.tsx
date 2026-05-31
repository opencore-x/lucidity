import * as React from 'react';
import { Host, Button, Image } from '@expo/ui/swift-ui';
import { buttonStyle, frame, glassEffect } from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';

// Square frame + a circle-shaped glassEffect draws a true round button (matching
// the round UserMenu avatar). `buttonStyle('glass')` alone hugs the icon and stays
// a capsule, so we use plain + glassEffect instead — the same recipe as the
// GlobalTaskSheet back/close buttons. 36pt to match the avatar (bumped to size-9).
const SIZE = 36;

/**
 * A native @expo/ui liquid-glass icon button for the nav header — the `+` create
 * action, the project-edit pencil, etc. Rendered in its own match-contents Host so
 * it drops straight into a React Navigation `headerRight`. Pair it with the (RN)
 * UserMenu avatar, which iOS 26 glasses to match.
 */
export function HeaderGlassButton({
  systemImage,
  onPress,
}: {
  systemImage: React.ComponentProps<typeof Image>['systemName'];
  onPress: () => void;
}) {
  const { colorScheme } = useColorScheme();
  return (
    <Host matchContents colorScheme={colorScheme === 'dark' ? 'dark' : 'light'}>
      <Button
        onPress={onPress}
        modifiers={[
          buttonStyle('plain'),
          frame({ width: SIZE, height: SIZE }),
          glassEffect({ glass: { variant: 'regular', interactive: true }, shape: 'circle' }),
        ]}>
        {/* No explicit color — the symbol inherits the adaptive label color (dark in
            light mode, light in dark mode), like the TaskSheet circle buttons. */}
        <Image systemName={systemImage} size={17} />
      </Button>
    </Host>
  );
}
