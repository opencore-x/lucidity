import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Host,
  ZStack,
  VStack,
  HStack,
  Spacer,
  Button,
  List,
  SwipeActions,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  tint,
  padding,
  listStyle,
  listRowSeparator,
  refreshable,
  frame,
  foregroundStyle,
  font,
  scrollDismissesKeyboard,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from '@/hooks/useColorScheme';
import { layout } from '@/lib/layout';
import { COLORS } from '@/lib/theme';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
import { SegmentTab } from '@/components/native/SegmentTab';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';
import { useProject, useProjects } from '@/hooks/useProjects';
import {
  useTasks,
  useCreateTask,
  useToggleTask,
  useUpdateTask,
  useReorderTasks,
} from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useSheetStore } from '@/stores/sheetStore';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { getSubtaskProgress, INBOX_PROJECT, INBOX_PROJECT_ID } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const TODAY_AMBER = '#F59E0B';

export default function ProjectScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { id, quickCapture } = useLocalSearchParams<{ id: string; quickCapture?: string }>();
  // Inbox is a virtual project (no DB row): synthesize it and skip the fetch.
  const isInbox = id === INBOX_PROJECT_ID;
  const { data: fetchedProject, isLoading: fetchedProjectLoading } = useProject(isInbox ? '' : id);
  const project = isInbox ? INBOX_PROJECT : fetchedProject;
  const projectLoading = isInbox ? false : fetchedProjectLoading;

  const { data: allTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { refetch: refetchProjects } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();
  const openProjectSheet = useProjectSheetStore((s) => s.openSheet);

  const rootTasks = React.useMemo(
    () =>
      allTasks.filter(
        (t) => (isInbox ? t.projectId === null : t.projectId === id) && !t.parentTaskId
      ),
    [allTasks, id, isInbox]
  );

  const activeTasks = React.useMemo(
    () => rootTasks.filter((t) => t.status !== 'completed'),
    [rootTasks]
  );

  const completedTasks = React.useMemo(
    () =>
      rootTasks
        .filter((t) => t.status === 'completed')
        .sort(
          (a, b) => new Date(b.completedAt ?? 0).getTime() - new Date(a.completedAt ?? 0).getTime()
        ),
    [rootTasks]
  );

  // Local order for the active list so a drag reflects immediately (useReorderTasks
  // only invalidates on settle). Re-synced when the active set changes.
  const [localTasks, setLocalTasks] = React.useState(activeTasks);
  const [selectedTab, setSelectedTab] = React.useState<'active' | 'completed'>('active');
  // Quick-capture deep link (home-screen "Add Task" quick action → Inbox) opens the
  // inline composer immediately — derived from the route param at mount.
  const [composing, setComposing] = React.useState(quickCapture === 'true');

  React.useEffect(() => {
    setLocalTasks(activeTasks);
  }, [activeTasks]);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([refetchTasks(), refetchProjects()]);
  }, [refetchTasks, refetchProjects]);

  const handleTaskPress = React.useCallback((task: Task) => openSheet(task), [openSheet]);
  const handleTaskToggle = React.useCallback(
    (taskId: string) => toggleTask.mutate(taskId),
    [toggleTask]
  );
  const handleDeleteTask = React.useCallback((taskId: string) => deleteTask(taskId), [deleteTask]);
  const handleSetDueToday = React.useCallback(
    (taskId: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateTask.mutate({ id: taskId, data: { dueDate: today } });
    },
    [updateTask]
  );

  // Native drag-reorder (List.ForEach onMove) — mirrors SwiftUI's move index semantics.
  const onMove = React.useCallback(
    (from: number[], to: number) => {
      const next = [...localTasks];
      const src = from[0];
      const [moved] = next.splice(src, 1);
      next.splice(src < to ? to - 1 : to, 0, moved);
      setLocalTasks(next);
      reorderTasks.mutate(next.map((t) => t.id));
    },
    [localTasks, reorderTasks]
  );

  const handleCreateTask = React.useCallback(() => setComposing(true), []);
  const handleSubmitTask = React.useCallback(
    (title: string) => createTask.mutate({ title, projectId: isInbox ? null : id }),
    [createTask, id, isInbox]
  );

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: '' }} />
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Stack.Screen options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: 'Not Found' }} />
        <View style={[layout.center, { backgroundColor: COLORS[scheme].background }]}>
          <Text style={{ color: COLORS[scheme].mutedForeground }}>Project not found</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          ...LARGE_TITLE_SCREEN_OPTIONS,
          title: project.name,
          headerTintColor: project.color ?? undefined,
          headerRight: () => (
            <View style={layout.headerActions}>
              {!isInbox ? (
                <HeaderGlassButton systemImage="pencil" onPress={() => openProjectSheet(project)} />
              ) : null}
              <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
              <UserMenu />
            </View>
          ),
        }}
      />
      <View style={[layout.flex1, { backgroundColor: COLORS[scheme].background }]}>
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          {/* ZStack (not VStack) so the List fills the whole Host — its dark insetGrouped
              background sits BEHIND the translucent glass composer (a VStack sibling would
              expose the bare Host background → opaque/white behind the glass). SwiftUI
              keyboard avoidance still floats the bottom-aligned composer above the keyboard.
              Description + tabs are the first, separator-less row. */}
          <ZStack
            alignment="bottom"
            modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
            <List
              modifiers={[
                listStyle('insetGrouped'),
                refreshable(onRefresh),
                scrollDismissesKeyboard('interactively'),
              ]}>
              <VStack spacing={8} alignment="leading" modifiers={[listRowSeparator('hidden')]}>
                {project.description ? (
                  <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
                    {project.description}
                  </UIText>
                ) : null}
                <HStack spacing={8}>
                  <SegmentTab
                    label="Active"
                    count={activeTasks.length}
                    selected={selectedTab === 'active'}
                    onPress={() => setSelectedTab('active')}
                    tintColor={project.color}
                  />
                  <SegmentTab
                    label="Completed"
                    count={completedTasks.length}
                    selected={selectedTab === 'completed'}
                    onPress={() => setSelectedTab('completed')}
                    tintColor={project.color}
                  />
                  <Spacer />
                </HStack>
              </VStack>

              {selectedTab === 'active' ? (
                <List.ForEach onMove={onMove}>
                  {localTasks.map((task) => (
                    <SwipeActions key={task.id}>
                      <TaskRow
                        task={task}
                        progress={getSubtaskProgress(allTasks, task.id)}
                        onToggle={() => handleTaskToggle(task.id)}
                        onOpen={() => handleTaskPress(task)}
                      />
                      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
                        <Button
                          label="Delete"
                          systemImage="trash"
                          role="destructive"
                          onPress={() => handleDeleteTask(task.id)}
                        />
                        <Button
                          label="Today"
                          systemImage="calendar"
                          onPress={() => handleSetDueToday(task.id)}
                          modifiers={[tint(TODAY_AMBER)]}
                        />
                      </SwipeActions.Actions>
                    </SwipeActions>
                  ))}
                </List.ForEach>
              ) : completedTasks.length === 0 ? (
                <UIText
                  modifiers={[
                    foregroundStyle(MUTED_GRAY),
                    frame({ maxWidth: Infinity, alignment: 'center' }),
                    padding({ vertical: 40 }),
                  ]}>
                  No completed tasks
                </UIText>
              ) : (
                completedTasks.map((task) => (
                  <SwipeActions key={task.id}>
                    <TaskRow
                      task={task}
                      progress={getSubtaskProgress(allTasks, task.id)}
                      onToggle={() => handleTaskToggle(task.id)}
                      onOpen={() => handleTaskPress(task)}
                    />
                    <SwipeActions.Actions edge="trailing">
                      <Button
                        label="Delete"
                        systemImage="trash"
                        role="destructive"
                        onPress={() => handleDeleteTask(task.id)}
                      />
                    </SwipeActions.Actions>
                  </SwipeActions>
                ))
              )}
            </List>
            {composing ? (
              <TaskComposer
                placeholder="Add task…"
                onSubmit={handleSubmitTask}
                onClose={() => setComposing(false)}
                surface
              />
            ) : null}
          </ZStack>
        </Host>
      </View>
    </>
  );
}
