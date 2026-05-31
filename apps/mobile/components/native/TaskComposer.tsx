import * as React from 'react';
import { HStack, Button, Image, TextField, useNativeState } from '@expo/ui/swift-ui';
import {
  frame,
  padding,
  glassEffect,
  buttonStyle,
  textFieldStyle,
} from '@expo/ui/swift-ui/modifiers';

const MUTED_GRAY = '#8E8E93';
const ICON_BLUE = '#0A84FF';

/**
 * Shared floating glass composer (✕ / multiline TextField / ▲). Pinned at the bottom
 * of its host so SwiftUI's keyboard avoidance floats it just above the keyboard —
 * the same pattern used for "Add Subtask"/"Add Comment" in the task sheet, reused on
 * the project / Today / Inbox lists for inline task entry.
 *
 * Must be rendered inside a `Host` (or a SwiftUI sheet) as the trailing child of a
 * VStack so it hugs the bottom. Multiline: Enter inserts a newline; submit is ONLY
 * the ▲ button. After sending — or on blur (abandon) — it calls `onClose`, which
 * dismisses the bar and the keyboard.
 */
export function TaskComposer({
  placeholder,
  onSubmit,
  onClose,
}: {
  placeholder: string;
  onSubmit: (text: string) => void;
  onClose: () => void;
}) {
  const textState = useNativeState('');
  const valueRef = React.useRef('');

  const submit = () => {
    const v = valueRef.current.trim();
    if (v) onSubmit(v);
    onClose();
  };

  return (
    <HStack
      spacing={8}
      alignment="bottom"
      modifiers={[
        frame({ maxWidth: Infinity }),
        padding({ horizontal: 16, vertical: 12 }),
        // Rounded rectangle (not capsule) so multi-line text doesn't bleed past the
        // rounded ends; cornerRadius keeps it soft for a single line too.
        glassEffect({ glass: { variant: 'regular' }, shape: 'roundedRectangle', cornerRadius: 22 }),
        padding({ leading: 8, trailing: 8, bottom: 6 }),
      ]}>
      <Button onPress={onClose} modifiers={[buttonStyle('plain')]}>
        <Image systemName="xmark.circle.fill" size={26} color={MUTED_GRAY} />
      </Button>
      <TextField
        text={textState}
        autoFocus
        placeholder={placeholder}
        axis="vertical"
        onTextChange={(t) => {
          valueRef.current = t;
        }}
        onFocusChange={(focused) => {
          if (!focused) onClose();
        }}
        modifiers={[textFieldStyle('plain'), frame({ maxWidth: Infinity })]}
      />
      <Button onPress={submit} modifiers={[buttonStyle('plain')]}>
        <Image systemName="arrow.up.circle.fill" size={28} color={ICON_BLUE} />
      </Button>
    </HStack>
  );
}
