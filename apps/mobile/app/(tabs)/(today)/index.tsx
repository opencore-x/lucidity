import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { TaskItem } from '@/components/TaskItem';
import { TaskSheet } from '@/components/TaskSheet';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Text as RNText, Dimensions, Alert, Pressable } from 'react-native';
import { Stack } from 'expo-router';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTasks, useCreateTask, useToggleTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import { CalendarX2, Check, Trash2 } from '@/lib/icons';
import { FONTS } from '@/lib/fonts';
import type { Task } from '@lucidity/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;

function ClearLeftAction({ confirmed }: { confirmed: boolean }) {
  return (
    <View
      style={{ backgroundColor: '#6366F1', width: SCREEN_WIDTH }}
      className="flex-row items-center pl-4 gap-1.5 h-full"
    >
      {confirmed ? (
        <>
          <Check size={18} color="#FFFFFF" />
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Removed
          </RNText>
        </>
      ) : (
        <>
          <CalendarX2 size={18} color="#FFFFFF" />
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Remove from Today
          </RNText>
        </>
      )}
    </View>
  );
}

function DeleteRightAction({ confirmed }: { confirmed: boolean }) {
  return (
    <View
      style={{ backgroundColor: '#EF4444', width: SCREEN_WIDTH }}
      className="flex-row items-center justify-end pr-4 gap-1.5 h-full"
    >
      {confirmed ? (
        <>
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Deleted
          </RNText>
          <Check size={18} color="#FFFFFF" />
        </>
      ) : (
        <>
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Delete
          </RNText>
          <Trash2 size={18} color="#FFFFFF" />
        </>
      )}
    </View>
  );
}

function SwipeableTodayTask({
  task,
  tasks,
  isLast,
  onPress,
  onToggle,
  onClearDueDate,
  onDeleteTask,
}: {
  task: Task;
  tasks: Task[];
  isLast: boolean;
  onPress: () => void;
  onToggle: () => void;
  onClearDueDate: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const swipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const [leftConfirmed, setLeftConfirmed] = React.useState(false);
  const [rightConfirmed, setRightConfirmed] = React.useState(false);

  const renderLeftActions = React.useCallback(
    () => <ClearLeftAction confirmed={leftConfirmed} />,
    [leftConfirmed]
  );

  const renderRightActions = React.useCallback(
    () => <DeleteRightAction confirmed={rightConfirmed} />,
    [rightConfirmed]
  );

  const handleSwipeOpen = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        onClearDueDate(task.id);
        setLeftConfirmed(true);
        setTimeout(() => {
          swipeableRef.current?.close();
          setLeftConfirmed(false);
        }, 1200);
      } else if (direction === 'left') {
        onDeleteTask(task.id);
        setRightConfirmed(true);
        setTimeout(() => {
          swipeableRef.current?.close();
          setRightConfirmed(false);
        }, 1200);
      }
    },
    [task.id, onClearDueDate, onDeleteTask]
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      friction={1}
      leftThreshold={SCREEN_WIDTH * 0.4}
      rightThreshold={SCREEN_WIDTH * 0.4}
    >
      <TaskItem
        task={task}
        subtaskProgress={getSubtaskProgress(tasks, task.id)}
        onPress={onPress}
        onToggle={onToggle}
        isLast={isLast}
      />
    </ReanimatedSwipeable>
  );
}

export default function TodayScreen() {
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();

  const projects = React.useMemo(
    () => allProjects.filter((p) => !p.isArchived),
    [allProjects]
  );

  const isLoading = tasksLoading || projectsLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTasks(), refetchProjects()]);
    setRefreshing(false);
  }, [refetchTasks, refetchProjects]);

  const todayTasks = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return tasks.filter((task) => {
      if (task.parentTaskId) return false;
      if (task.status === 'completed') return false;
      if (!task.dueDate) return false;
      const dueDate = new Date(task.dueDate);
      return dueDate < todayEnd;
    });
  }, [tasks]);

  const { overdueTasks, dueTodayTasks } = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const overdue: Task[] = [];
    const today: Task[] = [];

    todayTasks.forEach((task) => {
      const dueDate = new Date(task.dueDate!);
      if (dueDate < todayStart) {
        overdue.push(task);
      } else {
        today.push(task);
      }
    });

    return { overdueTasks: overdue, dueTodayTasks: today };
  }, [todayTasks]);

  const handleTaskPress = React.useCallback(
    (task: Task) => {
      openSheet(task);
    },
    [openSheet]
  );

  const handleTaskToggle = React.useCallback(
    (taskId: string) => {
      toggleTask.mutate(taskId);
    },
    [toggleTask]
  );

  const handleClearDueDate = React.useCallback(
    (taskId: string) => {
      updateTask.mutate({ id: taskId, data: { dueDate: null } });
    },
    [updateTask]
  );

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleCreateTask = React.useCallback(() => {
    Alert.prompt('New Task', 'This task will be due today.', [
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
    ], 'plain-text');
  }, [createTask]);

  const { currentTask } = useSheetStore();
  const sheetTask = currentTask();

  React.useEffect(() => {
    if (sheetTask && !tasks.find((t) => t.id === sheetTask.id)) {
      useSheetStore.getState().closeSheet();
    }
  }, [sheetTask, tasks]);

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-4">
        <Pressable onPress={handleCreateTask} hitSlop={8} className="pl-2">
          <Icon as={PlusIcon} className="size-6 text-foreground" />
        </Pressable>
        <UserMenu />
      </View>
    ),
    [handleCreateTask]
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {todayTasks.length === 0 ? (
          <View className="items-center justify-center px-8 pt-32">
            <Text className="text-6xl mb-4">🎉</Text>
            <Text className="text-xl font-semibold text-center mb-2">All caught up!</Text>
            <Text className="text-muted-foreground text-center">
              No tasks due today. Enjoy your day or add new tasks from the Projects tab.
            </Text>
          </View>
        ) : (
          <>
            {overdueTasks.length > 0 && (
              <View className="mb-4">
                <View className="px-4 py-2">
                  <Text className="text-sm font-semibold text-destructive">
                    Overdue ({overdueTasks.length})
                  </Text>
                </View>
                {overdueTasks.map((task, index) => (
                  <SwipeableTodayTask
                    key={task.id}
                    task={task}
                    tasks={tasks}
                    isLast={index === overdueTasks.length - 1}
                    onPress={() => handleTaskPress(task)}
                    onToggle={() => handleTaskToggle(task.id)}
                    onClearDueDate={handleClearDueDate}
                    onDeleteTask={handleDeleteTask}
                  />
                ))}
              </View>
            )}

            {dueTodayTasks.length > 0 && (
              <View className="mb-4">
                <View className="px-4 py-2">
                  <Text className="text-sm font-semibold text-foreground">
                    Due Today ({dueTodayTasks.length})
                  </Text>
                </View>
                {dueTodayTasks.map((task, index) => (
                  <SwipeableTodayTask
                    key={task.id}
                    task={task}
                    tasks={tasks}
                    isLast={index === dueTodayTasks.length - 1}
                    onPress={() => handleTaskPress(task)}
                    onToggle={() => handleTaskToggle(task.id)}
                    onClearDueDate={handleClearDueDate}
                    onDeleteTask={handleDeleteTask}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <View className="h-32" />
      </ScrollView>

      <TaskSheet tasks={tasks} projects={projects} />
    </>
  );
}
