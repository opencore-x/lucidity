import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { TaskItem } from '@/components/TaskItem';
import { TaskSheet } from '@/components/TaskSheet';
import { useUser } from '@clerk/clerk-expo';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

export default function TodayScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const toggleTask = useToggleTask();
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
        <View className="flex-row items-center gap-3">
          <UserMenu />
          <View>
            <Text className="text-2xl font-bold">Today</Text>
            <Text className="text-sm text-muted-foreground">
              {todayTasks.length} task{todayTasks.length !== 1 ? 's' : ''} due
            </Text>
          </View>
        </View>
        <ThemeToggle />
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
                <TaskItem
                  key={task.id}
                  task={task}
                  subtaskProgress={getSubtaskProgress(tasks, task.id)}
                  onPress={() => handleTaskPress(task)}
                  onToggle={() => handleTaskToggle(task.id)}
                  isLast={index === overdueTasks.length - 1}
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
                <TaskItem
                  key={task.id}
                  task={task}
                  subtaskProgress={getSubtaskProgress(tasks, task.id)}
                  onPress={() => handleTaskPress(task)}
                  onToggle={() => handleTaskToggle(task.id)}
                  isLast={index === dueTodayTasks.length - 1}
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

const THEME_ICONS = {
  light: SunIcon,
  dark: MoonStarIcon,
};

function ThemeToggle() {
  const { colorScheme, setColorScheme } = useColorScheme();

  const toggleTheme = React.useCallback(() => {
    setColorScheme(colorScheme === 'dark' ? 'light' : 'dark');
  }, [colorScheme, setColorScheme]);

  return (
    <Button onPress={toggleTheme} size="icon" variant="ghost" className="rounded-full">
      <Icon as={THEME_ICONS[colorScheme ?? 'light']} className="size-6" />
    </Button>
  );
}
