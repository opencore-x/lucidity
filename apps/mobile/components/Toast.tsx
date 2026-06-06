import * as React from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePathname } from 'expo-router';
import { Button, Host, HStack, Spacer, Text } from '@expo/ui/swift-ui';
import { buttonStyle, frame, glassEffect, padding } from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useToastStore } from '@/stores/toastStore';

// Routes pushed at the root stack (no native tab bar). On these the toast sits snug
// above the home indicator; everywhere else it clears the floating glass tab bar.
const PUSHED_ROUTE = /^\/(project|milestone|note|settings)/;

/**
 * The app-wide undo toast. Painted with native iOS 26 Liquid Glass (capsule) via
 * `@expo/ui`, matching the in-sheet `NativeUndoBar` in GlobalTaskSheet — both subscribe
 * to the same `toastStore`. Reanimated still drives the entrance/exit on the wrapper;
 * the glass material itself is the native SwiftUI `HStack`.
 */
export function Toast() {
  const { visible, message, handleUndo } = useToastStore();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colorScheme } = useColorScheme();
  const pathname = usePathname();

  if (!visible) return null;

  // Tab screens show the native glass tab bar, so clear it (+60). Pushed detail screens
  // have no tab bar, so sit just above the home indicator (+8).
  const bottomOffset = insets.bottom + (PUSHED_ROUTE.test(pathname) ? 8 : 60);

  // matchContents sizes the Host to the SwiftUI content, so give the HStack an explicit
  // width for the Spacer to push Undo to the edge. The frame sizes the *content*, and
  // `padding({ horizontal: 16 })` then adds 16pt on each side outside it — so subtract
  // that 32pt total, otherwise the glass capsule overflows the right inset and clips.
  const barWidth = width - 32 - 32;

  return (
    <Animated.View
      entering={FadeInDown.duration(250)}
      exiting={FadeOutDown.duration(200)}
      style={{
        position: 'absolute',
        bottom: bottomOffset,
        left: 16,
        right: 16,
      }}
      pointerEvents="box-none"
    >
      <Host matchContents colorScheme={colorScheme === 'dark' ? 'dark' : 'light'}>
        <HStack
          spacing={12}
          modifiers={[
            frame({ width: barWidth }),
            padding({ horizontal: 16, vertical: 12 }),
            glassEffect({ glass: { variant: 'regular' }, shape: 'capsule' }),
          ]}>
          <Text>{message}</Text>
          <Spacer />
          <Button label="Undo" onPress={handleUndo} modifiers={[buttonStyle('borderless')]} />
        </HStack>
      </Host>
    </Animated.View>
  );
}
