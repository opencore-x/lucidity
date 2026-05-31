import * as React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import {
  Host,
  VStack,
  HStack,
  Spacer,
  Button,
  List,
  SwipeActions,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  buttonStyle,
  tint,
  controlSize,
  padding,
  listStyle,
  listRowSeparator,
  refreshable,
  frame,
  foregroundStyle,
  font,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { TaskComposer } from '@/components/native/TaskComposer';
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
        <View className="bg-background flex-1 items-center justify-center">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Stack.Screen options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: 'Not Found' }} />
        <View className="bg-background flex-1 items-center justify-center">
          <Text className="text-muted-foreground">Project not found</Text>
        </View>
      </>
    );
  }

  const tabButton = (tab: 'active' | 'completed', label: string) => (
    <Button
      label={label}
      onPress={() => setSelectedTab(tab)}
      modifiers={[
        controlSize('small'),
        buttonStyle(selectedTab === tab ? 'glassProminent' : 'glass'),
        ...(project.color ? [tint(project.color)] : []),
      ]}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          ...LARGE_TITLE_SCREEN_OPTIONS,
          title: project.name,
          headerTintColor: project.color ?? undefined,
          headerRight: () => (
            <View className="flex-row items-center gap-2">
              {!isInbox ? (
                <HeaderGlassButton systemImage="pencil" onPress={() => openProjectSheet(project)} />
              ) : null}
              <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
              <UserMenu />
            </View>
          ),
        }}
      />
      <View className="bg-background flex-1">
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          {/* List + composer share one VStack so SwiftUI floats the composer above the
              keyboard (same as the task sheet). insetGrouped (like the landing) paints a
              solid background that fills the Host, so dark mode covers the entire body —
              not just the rows. Description + tabs are the first, separator-less row. */}
          <VStack spacing={0} modifiers={[frame({ maxWidth: Infinity, maxHeight: Infinity })]}>
            <List modifiers={[listStyle('insetGrouped'), refreshable(onRefresh)]}>
              <VStack spacing={8} alignment="leading" modifiers={[listRowSeparator('hidden')]}>
                {project.description ? (
                  <UIText modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
                    {project.description}
                  </UIText>
                ) : null}
                <HStack spacing={8}>
                  {tabButton('active', `Active (${activeTasks.length})`)}
                  {tabButton('completed', `Completed (${completedTasks.length})`)}
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
              />
            ) : null}
          </VStack>
        </Host>
      </View>
    </>
  );
}
