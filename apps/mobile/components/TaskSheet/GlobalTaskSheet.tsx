import * as React from 'react';
import {
  Host,
  BottomSheet,
  Group,
  VStack,
  HStack,
  Text,
  Button,
  Image,
  Spacer,
} from '@expo/ui/swift-ui';
import {
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
  buttonStyle,
  glassEffect,
  hidden,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useSheetStore } from '@/stores/sheetStore';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { StatusPill } from '@/components/TaskSheet/StatusPill';
import type { UpdateTask } from '@lucidity/shared';

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
  const updateCurrentTask = useSheetStore((s) => s.updateCurrentTask);

  const task = taskStack.length > 0 ? taskStack[taskStack.length - 1] : null;
  const canGoBack = taskStack.length > 1;

  // Optimistic field update; sync the server response back into the task stack
  // so the open sheet stays fresh (matches the old per-screen TaskSheet flow).
  const updateTask = useUpdateTask();
  const handleUpdateField = React.useCallback(
    (data: Partial<UpdateTask>) => {
      if (!task) return;
      updateTask.mutate(
        { id: task.id, data },
        { onSuccess: (updatedTask) => updateCurrentTask(updatedTask) }
      );
    },
    [task, updateTask, updateCurrentTask]
  );

  // Source data globally (replaces the per-screen `tasks` prop). Auto-close the
  // sheet if the open task disappears from the list (e.g. deleted elsewhere) —
  // consolidates the identical effect that lived in all five screens.
  const { data: allTasks = [] } = useTasks();
  React.useEffect(() => {
    if (task && !allTasks.find((t) => t.id === task.id)) {
      closeSheet();
    }
  }, [task, allTasks, closeSheet]);

  // A circular Liquid Glass icon button (back / close).
  const circleGlass = [
    buttonStyle('plain'),
    frame({ width: 34, height: 34 }),
    glassEffect({
      glass: { variant: 'regular', interactive: true },
      shape: 'circle',
    }),
  ];

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
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: 'topLeading',
            }),
            padding({ top: 16, leading: 16, trailing: 16 }),
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}
        >
          <VStack spacing={12}>
            <HStack spacing={8}>
              {/* Back is always rendered (hidden when at the root) so it reserves
                  symmetric width with Close, keeping the status pill centered. */}
              <Button
                onPress={goBack}
                modifiers={canGoBack ? circleGlass : [...circleGlass, hidden(true)]}
              >
                <Image systemName="chevron.left" size={16} />
              </Button>
              <Spacer />
              {task ? (
                <StatusPill
                  status={task.status}
                  onStatusChange={(status) => handleUpdateField({ status })}
                />
              ) : null}
              <Spacer />
              <Button onPress={closeSheet} modifiers={circleGlass}>
                <Image systemName="xmark" size={16} />
              </Button>
            </HStack>
            <Text>{task?.title ?? ''}</Text>
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
