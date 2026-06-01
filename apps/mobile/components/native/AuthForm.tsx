import * as React from 'react';
import { View } from 'react-native';
import { useColorScheme } from 'nativewind';
import { Host, List, VStack, Button, Text as UIText } from '@expo/ui/swift-ui';
import {
  listStyle,
  listSectionSpacing,
  listRowSeparator,
  frame,
  foregroundStyle,
  font,
  padding,
  buttonStyle,
  controlSize,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';
const DESTRUCTIVE_RED = '#FF3B30';

/**
 * Shared shell for the native auth screens: a full-screen `Host` + insetGrouped `List`
 * with a bold title row and optional subtitle. The form's fields/buttons are passed as
 * children (List rows / Sections). Used by sign-in, sign-up, verify-email, reset, forgot.
 */
export function AuthScreen({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  return (
    <View className="bg-background flex-1">
      <Host style={{ flex: 1 }} colorScheme={scheme}>
        <List modifiers={[listStyle('insetGrouped'), listSectionSpacing('compact')]}>
          <VStack
            spacing={4}
            alignment="leading"
            modifiers={[listRowSeparator('hidden'), padding({ top: 8 })]}>
            <UIText modifiers={[font({ size: 28, weight: 'bold' })]}>{title}</UIText>
            {subtitle ? (
              <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 15 })]}>
                {subtitle}
              </UIText>
            ) : null}
          </VStack>
          {children}
        </List>
      </Host>
    </View>
  );
}

/** Full-width prominent glass button (the primary action on each auth screen). */
export function PrimaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Button
      onPress={onPress}
      modifiers={[listRowSeparator('hidden'), buttonStyle('glassProminent'), controlSize('large')]}>
      {/* frame on the label (not the button) so the prominent button fills the width */}
      <UIText modifiers={[frame({ maxWidth: Infinity }), font({ weight: 'semibold' })]}>
        {label}
      </UIText>
    </Button>
  );
}

/** A red error row; renders nothing when there's no message. */
export function AuthError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <UIText
      modifiers={[
        listRowSeparator('hidden'),
        foregroundStyle(DESTRUCTIVE_RED),
        font({ size: 13 }),
      ]}>
      {message}
    </UIText>
  );
}
