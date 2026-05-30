import * as React from 'react';
import {
  Host,
  BottomSheet,
  Group,
  VStack,
  HStack,
  Text,
  Button,
  Spacer,
} from '@expo/ui/swift-ui';
import {
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
  buttonStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useSheetStore } from '@/stores/sheetStore';
import { useTasks } from '@/hooks/useTasks';

/**
 * Single global native (@expo/ui) bottom sheet for task details. Mounted once in
 * the root layout (signed-in only) and driven by `sheetStore.isPresented`, it
 * replaces the five per-screen <TaskSheet> mounts and sources its own data from
 * hooks. Phase 3.1: shell + title only; content is migrated in later phases.
 *
 * Canonical @expo/ui sheet pattern (validated in the spike): each BottomSheet
 * sits in its own zero-size absolute Host, and the content Group MUST carry
 * `frame({ maxWidth: Infinity })` or the SwiftUI content collapses and the sheet
 * presents invisibly.
 */
export function GlobalTaskSheet() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const isPresented = useSheetStore((s) => s.isPresented);
  const taskStack = useSheetStore((s) => s.taskStack);
  const closeSheet = useSheetStore((s) => s.closeSheet);
  const onDismissed = useSheetStore((s) => s.onDismissed);
  const goBack = useSheetStore((s) => s.goBack);

  const task = taskStack.length > 0 ? taskStack[taskStack.length - 1] : null;
  const canGoBack = taskStack.length > 1;

  // Source data globally (replaces the per-screen `tasks` prop). Auto-close the
  // sheet if the open task disappears from the list (e.g. deleted elsewhere) —
  // consolidates the identical effect that lived in all five screens.
  const { data: allTasks = [] } = useTasks();
  React.useEffect(() => {
    if (task && !allTasks.find((t) => t.id === task.id)) {
      closeSheet();
    }
  }, [task, allTasks, closeSheet]);

  return (
    <Host style={{ position: 'absolute' }} pointerEvents="none" colorScheme={scheme}>
      <BottomSheet
        isPresented={isPresented}
        onIsPresentedChange={(presented) => {
          if (!presented) closeSheet();
        }}
        onDismiss={onDismissed}
      >
        <Group
          modifiers={[
            frame({ maxWidth: Infinity, alignment: 'topLeading' }),
            padding({ top: 16, leading: 16, trailing: 16 }),
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack spacing={12}>
            <HStack spacing={8}>
              {canGoBack ? (
                <Button
                  label="Back"
                  onPress={goBack}
                  modifiers={[buttonStyle('glass')]}
                />
              ) : null}
              <Spacer />
              <Button
                label="Done"
                onPress={closeSheet}
                modifiers={[buttonStyle('glassProminent')]}
              />
            </HStack>
            <Text>{task?.title ?? ''}</Text>
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
