import * as React from 'react';
import { Alert } from 'react-native';
import { Asset } from 'expo-asset';
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
  Section,
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
  onTapGesture,
  resizable,
  clipShape,
  listStyle,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { useSheetStore } from '@/stores/sheetStore';
import { useToastStore } from '@/stores/toastStore';
import {
  useTasks,
  useUpdateTask,
  useToggleTask,
  useReorderTasks,
  useCreateTask,
} from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useMilestones } from '@/hooks/useMilestones';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useComments, useCreateComment, useDeleteComment } from '@/hooks/useComments';
import { useUser } from '@clerk/clerk-expo';
import { StatusPill } from '@/components/TaskSheet/StatusPill';
import {
  INBOX_PROJECT_ID,
  getSubtasks,
  getSubtaskProgress,
  formatRelativeTime,
} from '@/utils/helpers';
import type { Task, UpdateTask, Comment } from '@lucidity/shared';

// Match the tinted, larger SF Symbols that Picker rows render automatically.
const ICON_BLUE = '#0A84FF';
const ICON_SIZE = 22;
// Fixed leading-icon column width so every row's label lines up. Tune to taste.
const ICON_COL = 30;
// Secondary gray for the trailing selected-value text + chevron (systemGray, reads in both modes).
const MENU_VALUE_GRAY = '#8E8E93';
// Subtask checkbox: green when complete, systemGray3 ring when not.
const SUBTASK_DONE_GREEN = '#22C55E';
const CHECKBOX_GRAY = '#C7C7CC';
// Claude comment avatar tint (sparkles fallback while the logo loads).
const CLAUDE_PURPLE = '#A855F7';

// The native Image renders local images by file:// URI, so resolve the bundled
// Claude logo to a cached file path once (downloadAsync caches + sets localUri).
const claudeLogoAsset = Asset.fromModule(require('@/assets/images/claude-logo.png'));
function useClaudeLogoUri(): string | null {
  const [uri, setUri] = React.useState<string | null>(claudeLogoAsset.localUri ?? null);
  React.useEffect(() => {
    if (uri) return;
    let active = true;
    claudeLogoAsset.downloadAsync().then((a) => {
      if (active) setUri(a.localUri ?? null);
    });
    return () => {
      active = false;
    };
  }, [uri]);
  return uri;
}

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
          <HStack spacing={4} modifiers={[frame({ maxWidth: Infinity, alignment: 'trailing' })]}>
            <Text
              modifiers={[
                foregroundStyle(MENU_VALUE_GRAY),
                lineLimit(1),
                truncationMode('tail'),
                frame({ maxWidth: Infinity, alignment: 'trailing' }),
              ]}>
              {value}
            </Text>
            <Image systemName="chevron.up.chevron.down" size={12} color={MENU_VALUE_GRAY} />
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

/** A single subtask row: native circle checkbox + title + nested progress. */
function SubtaskRow({
  task,
  progress,
  onToggle,
  onOpen,
}: {
  task: Task;
  progress: { completed: number; total: number } | null;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const completed = task.status === 'completed';
  const titleMods = [
    lineLimit(1),
    truncationMode('tail'),
    frame({ maxWidth: Infinity, alignment: 'leading' }),
    ...(completed ? [foregroundStyle(MENU_VALUE_GRAY)] : []),
  ];
  return (
    <HStack spacing={12} modifiers={[onTapGesture(onOpen)]}>
      <Image
        systemName={completed ? 'checkmark.circle.fill' : 'circle'}
        size={22}
        color={completed ? SUBTASK_DONE_GREEN : CHECKBOX_GRAY}
        onPress={onToggle}
      />
      <Text modifiers={titleMods}>{task.title}</Text>
      {progress ? (
        <Text modifiers={[foregroundStyle(MENU_VALUE_GRAY)]}>
          {`${progress.completed}/${progress.total}`}
        </Text>
      ) : null}
    </HStack>
  );
}

/**
 * The open task's subtasks as a native `List.ForEach` (swipe-to-delete + long-press
 * drag-to-reorder). Owns a LOCAL ordered copy so a reorder reflects immediately —
 * `useReorderTasks` only invalidates on settle, so without this the row would snap
 * back until the refetch lands. Memoized + given a stable `subtasks` prop so its own
 * re-renders (from the mutation hooks) don't resync and clobber an in-flight drag.
 *
 * Returns a Fragment (not a VStack) on purpose: the `List.ForEach` must stay a direct
 * child of the parent `List` for its native reorder/delete gestures to bind.
 */
const SubtaskSection = React.memo(function SubtaskSection({
  parent,
  subtasks,
  allTasks,
  onOpen,
}: {
  parent: Task;
  subtasks: Task[];
  allTasks: Task[];
  onOpen: (task: Task) => void;
}) {
  const reorderTasks = useReorderTasks();
  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const { deleteTask } = useUndoableDeleteTask();

  const [order, setOrder] = React.useState(subtasks);
  React.useEffect(() => {
    setOrder(subtasks);
  }, [subtasks]);

  const promptAdd = React.useCallback(() => {
    Alert.prompt(
      'New Subtask',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (title?: string) => {
            const t = title?.trim();
            if (t) {
              createTask.mutate({
                title: t,
                projectId: parent.projectId,
                parentTaskId: parent.id,
                status: 'pending',
                priority: 500,
              });
            }
          },
        },
      ],
      'plain-text'
    );
  }, [createTask, parent.id, parent.projectId]);

  const completedCount = order.filter((t) => t.status === 'completed').length;

  return (
    <>
      {order.length > 0 ? (
        <>
          <HStack modifiers={[padding({ leading: 4, top: 4 })]}>
            <Text modifiers={[foregroundStyle(MENU_VALUE_GRAY)]}>Subtasks</Text>
            <Spacer />
            <Text modifiers={[foregroundStyle(MENU_VALUE_GRAY)]}>
              {`${completedCount}/${order.length}`}
            </Text>
          </HStack>
          <List.ForEach
            onMove={(from, to) => {
              const next = [...order];
              const src = from[0];
              const [moved] = next.splice(src, 1);
              // Mirror SwiftUI's Array.move(fromOffsets:toOffset:) index semantics.
              next.splice(src < to ? to - 1 : to, 0, moved);
              setOrder(next);
              reorderTasks.mutate(next.map((t) => t.id));
            }}
            onDelete={(indices) => {
              indices.forEach((i) => {
                const t = order[i];
                if (t) deleteTask(t.id);
              });
            }}>
            {order.map((st) => (
              <SubtaskRow
                key={st.id}
                task={st}
                progress={getSubtaskProgress(allTasks, st.id)}
                onToggle={() => toggleTask.mutate(st.id)}
                onOpen={() => onOpen(st)}
              />
            ))}
          </List.ForEach>
        </>
      ) : null}

      <HStack spacing={12} modifiers={[onTapGesture(promptAdd)]}>
        <Image systemName="plus.circle.fill" size={22} color={ICON_BLUE} />
        <Text modifiers={[foregroundStyle(ICON_BLUE)]}>Add Subtask</Text>
        <Spacer />
      </HStack>
    </>
  );
});

/**
 * Native undo bar for in-sheet deletes. The app's RN `<Toast>` renders at the React
 * root, which sits BEHIND the UIKit-presented native sheet — so it's invisible while
 * the sheet is open. This bar subscribes to the same `toastStore` (reusing its timer +
 * undo restore) but paints inside the SwiftUI sheet, so it shows above it.
 */
function NativeUndoBar() {
  const visible = useToastStore((s) => s.visible);
  const message = useToastStore((s) => s.message);
  const handleUndo = useToastStore((s) => s.handleUndo);

  if (!visible) return null;

  return (
    <HStack
      spacing={12}
      modifiers={[
        frame({ maxWidth: Infinity }),
        padding({ horizontal: 16, vertical: 12 }),
        glassEffect({ glass: { variant: 'regular' }, shape: 'capsule' }),
        padding({ leading: 8, trailing: 8, bottom: 8 }),
      ]}>
      <Text>{message}</Text>
      <Spacer />
      <Button label="Undo" onPress={handleUndo} modifiers={[buttonStyle('borderless')]} />
    </HStack>
  );
}

/** One comment: author row (avatar + @name + relative time) + markdown body. */
function CommentRow({
  comment,
  displayName,
  claudeLogoUri,
}: {
  comment: Comment;
  displayName: string;
  claudeLogoUri: string | null;
}) {
  const isClaude = comment.source === 'claude';
  return (
    <VStack
      spacing={4}
      alignment="leading"
      modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
      <HStack spacing={6}>
        {isClaude && claudeLogoUri ? (
          <Image
            uiImage={claudeLogoUri}
            modifiers={[resizable(), frame({ width: 16, height: 16 }), clipShape('circle')]}
          />
        ) : (
          <Image
            systemName={isClaude ? 'sparkles' : 'person.crop.circle.fill'}
            size={16}
            color={isClaude ? CLAUDE_PURPLE : MENU_VALUE_GRAY}
          />
        )}
        <Text>{`@${displayName}`}</Text>
        <Text modifiers={[foregroundStyle(MENU_VALUE_GRAY)]}>
          {formatRelativeTime(comment.createdAt)}
        </Text>
      </HStack>
      {/* SwiftUI markdown is inline-only (bold/italic/links/inline-code); block
          elements like headings/lists/code-blocks render as plain text. */}
      <Text markdownEnabled modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        {comment.content}
      </Text>
    </VStack>
  );
}

/**
 * The task's comments as their OWN inset-grouped `Section` (a separate card from the
 * subtasks/options below it): a count header row, a `List.ForEach` of comment rows
 * (swipe-to-delete via `useDeleteComment`'s optimistic removal), and an "Add Comment"
 * row that fires a native prompt into `useCreateComment`.
 */
function CommentsSection({ taskId }: { taskId: string }) {
  const { user } = useUser();
  const { data: comments } = useComments(taskId);
  const createComment = useCreateComment();
  const deleteComment = useDeleteComment();
  const claudeLogoUri = useClaudeLogoUri();

  const userName = user?.username || user?.fullName?.toLowerCase().replace(/\s+/g, '') || 'you';

  const promptAdd = React.useCallback(() => {
    Alert.prompt(
      'New Comment',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add',
          onPress: (content?: string) => {
            const c = content?.trim();
            if (c) createComment.mutate({ taskId, content: c });
          },
        },
      ],
      'plain-text'
    );
  }, [createComment, taskId]);

  const list = comments ?? [];
  const [expanded, setExpanded] = React.useState(true);

  return (
    <Section>
      {/* Header doubles as the collapse toggle (insetGrouped can't use the native
          collapsible Section, which is sidebar-only). */}
      <HStack
        spacing={6}
        modifiers={[padding({ leading: 4, top: 4 }), onTapGesture(() => setExpanded((e) => !e))]}>
        <Image systemName="bubble.left" size={ICON_SIZE - 4} color={MENU_VALUE_GRAY} />
        <Text modifiers={[foregroundStyle(MENU_VALUE_GRAY)]}>
          {list.length > 0 ? `Comments (${list.length})` : 'Comments'}
        </Text>
        <Spacer />
        <Image
          systemName={expanded ? 'chevron.down' : 'chevron.right'}
          size={13}
          color={MENU_VALUE_GRAY}
        />
      </HStack>

      {expanded ? (
        <>
          {list.length > 0 ? (
            <List.ForEach
              onDelete={(indices) => {
                indices.forEach((i) => {
                  const c = list[i];
                  if (c) deleteComment.mutate({ taskId, commentId: c.id });
                });
              }}>
              {list.map((c) => (
                <CommentRow
                  key={c.id}
                  comment={c}
                  displayName={c.source === 'claude' ? 'claude' : userName}
                  claudeLogoUri={claudeLogoUri}
                />
              ))}
            </List.ForEach>
          ) : null}

          <HStack spacing={12} modifiers={[onTapGesture(promptAdd)]}>
            <Image systemName="plus.circle.fill" size={22} color={ICON_BLUE} />
            <Text modifiers={[foregroundStyle(ICON_BLUE)]}>Add Comment</Text>
            <Spacer />
          </HStack>
        </>
      ) : null}
    </Section>
  );
}

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
  const drillDown = useSheetStore((s) => s.drillDown);
  const updateCurrentTask = useSheetStore((s) => s.updateCurrentTask);

  const task = taskStack.length > 0 ? taskStack[taskStack.length - 1] : null;
  const canGoBack = taskStack.length > 1;

  // Source data globally (replaces the per-screen props). Auto-close if the open
  // task disappears from the list (deleted elsewhere).
  const { data: allTasks = [] } = useTasks();
  const { data: allProjects = [] } = useProjects();
  const projects = allProjects.filter((p) => !p.isArchived);
  const { data: milestones = [] } = useMilestones(task?.projectId ?? null);

  // Stable per (allTasks, task.id) so SubtaskSection's local order isn't resynced
  // (and a live drag clobbered) on unrelated re-renders.
  const subtasks = React.useMemo(
    () => (task ? getSubtasks(allTasks, task.id) : []),
    [allTasks, task?.id]
  );

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
              <List modifiers={[listStyle('insetGrouped')]}>
                <CommentsSection taskId={task.id} />

                <SubtaskSection
                  parent={task}
                  subtasks={subtasks}
                  allTasks={allTasks}
                  onOpen={drillDown}
                />

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

            <NativeUndoBar />
          </VStack>
        </Group>
      </BottomSheet>
    </Host>
  );
}
