import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { TaskItem } from '@/components/TaskItem';
import { TaskSheet } from '@/components/TaskSheet';
import { useUser } from '@clerk/clerk-expo';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Text as RNText, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { useTasks, useToggleTask, useUpdateTask } from '@/hooks/useTasks';
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
  const { user } = useUser();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();

  // Filter out archived projects
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

  // Filter tasks for today (due today or overdue, excluding subtasks)
  const todayTasks = React.useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setDate(todayEnd.getDate() + 1);

    return tasks.filter((task) => {
      // Exclude subtasks - only show root-level tasks
      if (task.parentTaskId) return false;
      // Exclude completed tasks
      if (task.status === 'completed') return false;
      // Include if no due date? For now, only show tasks with due dates
      if (!task.dueDate) return false;

      const dueDate = new Date(task.dueDate);
      // Include if due today or overdue
      return dueDate < todayEnd;
    });
  }, [tasks]);

  // Separate overdue and today's tasks
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

  // Get current sheet data for stale validation
  const { currentTask } = useSheetStore();
  const sheetTask = currentTask();

  // Close task sheet if task was deleted
  React.useEffect(() => {
    if (sheetTask && !tasks.find((t) => t.id === sheetTask.id)) {
      useSheetStore.getState().closeSheet();
    }
  }, [sheetTask, tasks]);

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ` ${user.lastName}` : ''}`
    : user?.emailAddresses?.[0]?.emailAddress || 'User';

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const hasNoTasks = todayTasks.length === 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header with avatar, greeting, and theme toggle */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-8">
        <View>
          <Text className="text-2xl font-bold">Today</Text>
          <Text className="text-sm text-muted-foreground">
            {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} due
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <UserMenu />
        </View>
      </View>

      {/* Task list */}
      {hasNoTasks ? (
        <View className="flex-1 items-center justify-center px-8">
          <Text className="text-6xl mb-4">🎉</Text>
          <Text className="text-xl font-semibold text-center mb-2">All caught up!</Text>
          <Text className="text-muted-foreground text-center">
            No tasks due today. Enjoy your day or add new tasks from the Projects tab.
          </Text>
        </View>
      ) : (
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Overdue section */}
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

          {/* Due Today section */}
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

          {/* Bottom padding */}
          <View className="h-32" />
        </ScrollView>
      )}

      {/* Task Sheet */}
      <TaskSheet tasks={tasks} projects={projects} />
    </SafeAreaView>
  );
}
