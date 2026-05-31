import * as React from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import { Stack } from 'expo-router';
import {
  Host,
  Button,
  List,
  Section,
  SwipeActions,
  Text as UIText,
} from '@expo/ui/swift-ui';
import {
  tint,
  listStyle,
  refreshable,
  frame,
  foregroundStyle,
  font,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { HeaderGlassButton } from '@/components/native/HeaderGlassButton';
import { TaskRow } from '@/components/native/TaskRow';
import { useTasks, useCreateTask, useToggleTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const OVERDUE_RED = '#EF4444';
// Indigo "Remove from Today" swipe — matches the old left-action background.
const REMOVE_INDIGO = '#6366F1';

export default function TodayScreen() {
  const { colorScheme } = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();

  const isLoading = tasksLoading || projectsLoading;

  const todayTasks = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return tasks.filter((task) => {
      if (task.parentTaskId) return false;
      if (task.status === 'completed') return false;
      if (!task.dueDate) return false;
      return new Date(task.dueDate) < todayEnd;
    });
  }, [tasks]);

  const { overdueTasks, dueTodayTasks } = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdue: Task[] = [];
    const today: Task[] = [];
    todayTasks.forEach((task) => {
      if (new Date(task.dueDate!) < todayStart) overdue.push(task);
      else today.push(task);
    });
    return { overdueTasks: overdue, dueTodayTasks: today };
  }, [todayTasks]);

  const onRefresh = React.useCallback(async () => {
    await Promise.all([refetchTasks(), refetchProjects()]);
  }, [refetchTasks, refetchProjects]);

  const handleTaskPress = React.useCallback((task: Task) => openSheet(task), [openSheet]);
  const handleTaskToggle = React.useCallback(
    (taskId: string) => toggleTask.mutate(taskId),
    [toggleTask]
  );
  const handleClearDueDate = React.useCallback(
    (taskId: string) => updateTask.mutate({ id: taskId, data: { dueDate: null } }),
    [updateTask]
  );
  const handleDeleteTask = React.useCallback((taskId: string) => deleteTask(taskId), [deleteTask]);

  const handleCreateTask = React.useCallback(() => {
    Alert.prompt(
      'New Task',
      'This task will be due today.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Task',
          onPress: (title?: string) => {
            if (title?.trim()) {
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              createTask.mutate({ title: title.trim(), dueDate: today });
            }
          },
        },
      ],
      'plain-text'
    );
  }, [createTask]);

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-2">
        <HeaderGlassButton systemImage="plus" onPress={handleCreateTask} />
        <UserMenu />
      </View>
    ),
    [handleCreateTask]
  );

  const renderRow = React.useCallback(
    (task: Task) => (
      <SwipeActions key={task.id}>
        <TaskRow
          task={task}
          progress={getSubtaskProgress(tasks, task.id)}
          onToggle={() => handleTaskToggle(task.id)}
          onOpen={() => handleTaskPress(task)}
        />
        <SwipeActions.Actions edge="leading">
          <Button
            label="Remove"
            systemImage="calendar.badge.minus"
            onPress={() => handleClearDueDate(task.id)}
            modifiers={[tint(REMOVE_INDIGO)]}
          />
        </SwipeActions.Actions>
        <SwipeActions.Actions edge="trailing">
          <Button
            label="Delete"
            systemImage="trash"
            role="destructive"
            onPress={() => handleDeleteTask(task.id)}
          />
        </SwipeActions.Actions>
      </SwipeActions>
    ),
    [tasks, handleTaskToggle, handleTaskPress, handleClearDueDate, handleDeleteTask]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Today', headerRight }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Today', headerRight }} />
      <View className="flex-1 bg-background">
        <Host style={{ flex: 1 }} colorScheme={scheme}>
          {/* insetGrouped paints a solid background that fills the whole Host, so dark
              mode covers the entire body (matches the project screen). */}
          <List modifiers={[listStyle('insetGrouped'), refreshable(onRefresh)]}>
            {todayTasks.length === 0 ? (
              <UIText
                modifiers={[
                  foregroundStyle(MUTED_GRAY),
                  frame({ maxWidth: Infinity, alignment: 'center' }),
                  padding({ vertical: 56 }),
                ]}>
                🎉  All caught up — nothing due today.
              </UIText>
            ) : (
              <>
                {overdueTasks.length > 0 ? (
                  <Section
                    header={
                      <UIText
                        modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(OVERDUE_RED)]}>
                        {`Overdue (${overdueTasks.length})`}
                      </UIText>
                    }>
                    {overdueTasks.map(renderRow)}
                  </Section>
                ) : null}

                {dueTodayTasks.length > 0 ? (
                  <Section
                    header={
                      <UIText
                        modifiers={[font({ size: 13, weight: 'semibold' }), foregroundStyle(MUTED_GRAY)]}>
                        {`Due Today (${dueTodayTasks.length})`}
                      </UIText>
                    }>
                    {dueTodayTasks.map(renderRow)}
                  </Section>
                ) : null}
              </>
            )}
          </List>
        </Host>
      </View>
    </>
  );
}
