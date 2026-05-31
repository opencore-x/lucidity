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
  List,
  Menu,
  Slider,
  DatePicker,
  Toggle,
} from '@expo/ui/swift-ui';
import {
  frame,
  padding,
  presentationDetents,
  presentationDragIndicator,
  buttonStyle,
  glassEffect,
  hidden,
  datePickerStyle,
  labelsHidden,
  lineLimit,
  truncationMode,
  foregroundStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useSheetStore } from '@/stores/sheetStore';
import { useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useMilestones } from '@/hooks/useMilestones';
import { StatusPill } from '@/components/TaskSheet/StatusPill';
import { INBOX_PROJECT_ID } from '@/utils/helpers';
import type { Task, UpdateTask } from '@lucidity/shared';

// Match the tinted, larger SF Symbols that Picker rows render automatically.
const ICON_BLUE = '#0A84FF';
const ICON_SIZE = 22;
// Fixed leading-icon column width so every row's label lines up. Tune to taste.
const ICON_COL = 30;
// Secondary gray for the trailing selected-value text + chevron (systemGray, reads in both modes).
const MENU_VALUE_GRAY = '#8E8E93';

const MILESTONE_NONE = '__none__';
const REPEAT_NONE = '__never__';
const REPEAT_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
] as const;

type MenuOption = { value: string; label: string };

/**
 * A menu-backed option row (Project / Milestone / Repeat). Built on `Menu` (not the
 * native `Picker`) because a menu-style Picker auto-renders its selected value as
 * trailing detail text that wraps vertically in a List row — `lineLimit(1)` on the
 * Picker doesn't reach that internal label. Here the value `Text` is ours, so
 * `frame(maxWidth: Infinity, alignment: 'trailing')` + `lineLimit(1)` +
 * `truncationMode('tail')` makes a long name truncate with an ellipsis instead.
 */
function MenuRow({
  icon,
  label,
  value,
  options,
  selection,
  onSelect,
}: {
  icon: React.ComponentProps<typeof Image>['systemName'];
  label: string;
  value: string;
  options: readonly MenuOption[];
  selection: string;
  onSelect: (value: string) => void;
}) {
  return (
    <HStack spacing={8}>
      <Image
        systemName={icon}
        size={ICON_SIZE}
        color={ICON_BLUE}
        modifiers={[frame({ width: ICON_COL })]}
      />
      <Text>{label}</Text>
      <Menu
        label={
          <HStack
            spacing={4}
            modifiers={[frame({ maxWidth: Infinity, alignment: 'trailing' })]}>
            <Text
              modifiers={[
                foregroundStyle(MENU_VALUE_GRAY),
                lineLimit(1),
                truncationMode('tail'),
                frame({ maxWidth: Infinity, alignment: 'trailing' }),
              ]}>
              {value}
            </Text>
            <Image
              systemName="chevron.up.chevron.down"
              size={12}
              color={MENU_VALUE_GRAY}
            />
          </HStack>
        }>
        {options.map((o) => (
          <Button
            key={o.value}
            label={o.label}
            systemImage={o.value === selection ? 'checkmark' : undefined}
            onPress={() => {
              if (o.value !== selection) onSelect(o.value);
            }}
          />
        ))}
      </Menu>
    </HStack>
  );
}

/**
 * Priority slider row. Keeps the live drag value in LOCAL state so dragging only
 * re-renders this row (not the whole sheet), and commits once on release.
 */
const PriorityRow = React.memo(function PriorityRow({
  priority,
  onCommit,
}: {
  priority: number;
  onCommit: (priority: number) => void;
}) {
  const [live, setLive] = React.useState<number | null>(null);
  const liveRef = React.useRef<number | null>(null);

  return (
    <VStack spacing={4}>
      <HStack spacing={8}>
        <Image
          systemName="exclamationmark.circle"
          size={ICON_SIZE}
          color={ICON_BLUE}
          modifiers={[frame({ width: ICON_COL })]}
        />
        <Text>Priority</Text>
        <Spacer />
        <Text>{String(live ?? priority)}</Text>
      </HStack>
      <Slider
        value={priority}
        min={100}
        max={1000}
        step={100}
        onValueChange={(v) => {
          const val = Math.round(v);
          liveRef.current = val;
          setLive(val);
        }}
        onEditingChanged={(editing) => {
          if (!editing) {
            const val = liveRef.current;
            liveRef.current = null;
            setLive(null);
            if (val != null && val !== priority) onCommit(val);
          }
        }}
      />
    </VStack>
  );
});

/**
 * Single global native (@expo/ui) bottom sheet for task details. Mounted once in
 * the root layout (signed-in only) and driven by `sheetStore.isPresented`. Sources
 * its own data from hooks. Phases done: 3.1 shell, 3.2 top bar + status pill,
 * 3.3a options (Project/Milestone/Repeat pickers + priority slider). Still to
 * migrate: due/reminder pickers (3.3b), subtasks (3.4), comments (3.5), inline
 * title/description editing (3.6), parent picker (3.7).
 *
 * Canonical @expo/ui sheet pattern: each BottomSheet sits in its own zero-size
 * absolute Host, and the content Group MUST carry `frame({ maxWidth: Infinity })`
 * or the SwiftUI content collapses and the sheet presents invisibly.
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

  // Source data globally (replaces the per-screen props). Auto-close if the open
  // task disappears from the list (deleted elsewhere).
  const { data: allTasks = [] } = useTasks();
  const { data: allProjects = [] } = useProjects();
  const projects = allProjects.filter((p) => !p.isArchived);
  const { data: milestones = [] } = useMilestones(task?.projectId ?? null);

  React.useEffect(() => {
    if (task && !allTasks.find((t) => t.id === task.id)) {
      closeSheet();
    }
  }, [task, allTasks, closeSheet]);

  // Optimistic field update; sync the server response back into the task stack
  // so the open sheet stays fresh (matches the old per-screen TaskSheet flow).
  const updateTask = useUpdateTask();
  const handleUpdateField = React.useCallback(
    (data: Partial<UpdateTask>) => {
      if (!task) return;
      // Reflect the change in the open sheet immediately (optimistic) so the UI
      // doesn't wait for the server round-trip; the mutation also updates the
      // query cache and re-syncs the authoritative task on success.
      updateCurrentTask({ ...task, ...data } as Task);
      updateTask.mutate(
        { id: task.id, data },
        { onSuccess: (updatedTask) => updateCurrentTask(updatedTask) }
      );
    },
    [task, updateTask, updateCurrentTask]
  );

  // A circular Liquid Glass icon button (back / close).
  const circleGlass = [
    buttonStyle('plain'),
    frame({ width: 40, height: 40 }),
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
        onDismiss={onDismissed}>
        <Group
          modifiers={[
            frame({
              maxWidth: Infinity,
              maxHeight: Infinity,
              alignment: 'topLeading',
            }),
            padding({ top: 28, leading: 8, trailing: 8 }),
            presentationDetents(['medium', 'large']),
            presentationDragIndicator('visible'),
          ]}>
          <VStack spacing={12}>
            {/* Top bar: back (hidden at root, reserves width) / status / close */}
            <HStack spacing={8} modifiers={[padding({ horizontal: 6 })]}>
              <Button
                onPress={goBack}
                modifiers={canGoBack ? circleGlass : [...circleGlass, hidden(true)]}>
                <Image systemName="chevron.left" size={18} />
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
                <Image systemName="xmark" size={18} />
              </Button>
            </HStack>

            {task ? (
              <Text modifiers={[padding({ leading: 16, trailing: 16 })]}>{task.title}</Text>
            ) : null}

            {task ? (
              <List>
                <MenuRow
                  icon="folder"
                  label="Project"
                  value={
                    task.projectId
                      ? (allProjects.find((p) => p.id === task.projectId)?.name ?? 'Inbox')
                      : 'Inbox'
                  }
                  selection={task.projectId ?? INBOX_PROJECT_ID}
                  options={[
                    { value: INBOX_PROJECT_ID, label: 'Inbox' },
                    ...projects.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                  onSelect={(value) => {
                    const projectId = value === INBOX_PROJECT_ID ? null : value;
                    if (projectId !== task.projectId) {
                      handleUpdateField({ projectId, milestoneId: null });
                    }
                  }}
                />

                {task.projectId ? (
                  <MenuRow
                    icon="flag"
                    label="Milestone"
                    value={
                      task.milestoneId
                        ? (milestones.find((m) => m.id === task.milestoneId)?.name ?? 'None')
                        : 'None'
                    }
                    selection={task.milestoneId ?? MILESTONE_NONE}
                    options={[
                      { value: MILESTONE_NONE, label: 'None' },
                      ...milestones.map((m) => ({ value: m.id, label: m.name })),
                    ]}
                    onSelect={(value) => {
                      const milestoneId = value === MILESTONE_NONE ? null : value;
                      if (milestoneId !== task.milestoneId) {
                        handleUpdateField({ milestoneId });
                      }
                    }}
                  />
                ) : null}

                {/* Due date — single row: Add when empty, picker + clear when set */}
                {task.dueDate ? (
                  <HStack spacing={8}>
                    <Image
                      systemName="calendar"
                      size={ICON_SIZE}
                      color={ICON_BLUE}
                      modifiers={[frame({ width: ICON_COL })]}
                    />
                    <Text>Due</Text>
                    <Spacer />
                    <DatePicker
                      selection={new Date(task.dueDate)}
                      displayedComponents={['date']}
                      onDateChange={(d) => handleUpdateField({ dueDate: d })}
                      modifiers={[datePickerStyle('compact'), labelsHidden()]}
                    />
                    <Image
                      systemName="xmark.circle.fill"
                      size={18}
                      color="#9CA3AF"
                      onPress={() => handleUpdateField({ dueDate: null })}
                    />
                  </HStack>
                ) : (
                  <HStack spacing={8}>
                    <Image
                      systemName="calendar"
                      size={ICON_SIZE}
                      color={ICON_BLUE}
                      modifiers={[frame({ width: ICON_COL })]}
                    />
                    <Text>Due Date</Text>
                    <Spacer />
                    <Button
                      label="Add"
                      onPress={() => handleUpdateField({ dueDate: new Date() })}
                      modifiers={[buttonStyle('borderless')]}
                    />
                  </HStack>
                )}

                {task.dueDate ? (
                  <MenuRow
                    icon="repeat"
                    label="Repeat"
                    value={
                      REPEAT_OPTIONS.find((r) => r.value === task.recurringFrequency)?.label ??
                      'Never'
                    }
                    selection={task.recurringFrequency ?? REPEAT_NONE}
                    options={[
                      { value: REPEAT_NONE, label: 'Never' },
                      ...REPEAT_OPTIONS.map((r) => ({ value: r.value, label: r.label })),
                    ]}
                    onSelect={(value) => {
                      const rf =
                        value === REPEAT_NONE
                          ? null
                          : (value as 'daily' | 'weekly' | 'monthly' | 'yearly');
                      if (rf !== task.recurringFrequency) {
                        handleUpdateField({ recurringFrequency: rf });
                      }
                    }}
                  />
                ) : null}

                <PriorityRow
                  priority={task.priority}
                  onCommit={(priority) => handleUpdateField({ priority })}
                />

                {/* Reminder — kept LAST because the revealed graphical calendar
                    is tall; placing it at the end keeps the other rows compact. */}
                <HStack spacing={8}>
                  <Image
                    systemName="bell"
                    size={ICON_SIZE}
                    color={ICON_BLUE}
                    modifiers={[frame({ width: ICON_COL })]}
                  />
                  <Text>Reminder</Text>
                  <Spacer />
                  <Toggle
                    isOn={!!task.reminderAt}
                    onIsOnChange={(on) =>
                      handleUpdateField({
                        reminderAt: on ? new Date(Date.now() + 60 * 60 * 1000) : null,
                      })
                    }
                    modifiers={[labelsHidden()]}
                  />
                </HStack>
                {task.reminderAt ? (
                  <DatePicker
                    selection={new Date(task.reminderAt)}
                    displayedComponents={['date', 'hourAndMinute']}
                    onDateChange={(d) => handleUpdateField({ reminderAt: d })}
                    modifiers={[datePickerStyle('graphical'), labelsHidden()]}
                  />
                ) : null}
              </List>
            ) : null}
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
