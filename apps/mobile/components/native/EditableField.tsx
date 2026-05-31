import * as React from 'react';
import { TextField, useNativeState } from '@expo/ui/swift-ui';
import type { TextFieldRef } from '@expo/ui/swift-ui';

/**
 * Always-editable native `TextField` for inline title / name / description editing.
 * Native-state backed, so keystrokes don't re-render the tree; the latest value is
 * tracked via `onTextChange` and committed on blur (`onFocusChange(false)`) only if
 * it changed. Remount via `key` (e.g. per entity id) so the field resets to a new
 * value with no mid-focus `setText` races. `allowEmpty=false` reverts an emptied
 * field back to `value`.
 *
 * Shared by GlobalTaskSheet and GlobalProjectSheet.
 */
export function EditableField({
  value,
  onCommit,
  allowEmpty = false,
  multiline = false,
  placeholder,
  onFocusEnter,
  onFocusLeave,
  modifiers: extraModifiers = [],
}: {
  value: string;
  onCommit: (text: string) => void;
  allowEmpty?: boolean;
  multiline?: boolean;
  placeholder?: string;
  // Lets the parent show a "Done" affordance while editing; `blur` dismisses + commits.
  onFocusEnter?: (blur: () => void) => void;
  onFocusLeave?: () => void;
  modifiers?: React.ComponentProps<typeof TextField>['modifiers'];
}) {
  const textState = useNativeState(value);
  const ref = React.useRef<TextFieldRef>(null);
  const valueRef = React.useRef(value);

  return (
    <TextField
      ref={ref}
      text={textState}
      placeholder={placeholder}
      axis={multiline ? 'vertical' : 'horizontal'}
      onTextChange={(t) => {
        valueRef.current = t;
      }}
      onFocusChange={(focused) => {
        if (focused) {
          onFocusEnter?.(() => ref.current?.blur());
          return;
        }
        const trimmed = valueRef.current.trim();
        if (!allowEmpty && !trimmed) {
          valueRef.current = value;
          ref.current?.setText(value);
        } else if (trimmed !== value.trim()) {
          onCommit(trimmed);
        }
        onFocusLeave?.();
      }}
      modifiers={extraModifiers}
    />
  );
}
