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

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getMonday(date: Date): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust when day is Sunday
  d.setDate(d.getDate() + diff);
  return d;
}

function formatDayHeader(date: Date, today: Date): string {
  const dayName = DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1];
  const monthDay = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  if (dateStart.getTime() === todayStart.getTime()) {
    return `Today · ${monthDay}`;
  }

  const tomorrow = new Date(todayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (dateStart.getTime() === tomorrow.getTime()) {
    return `Tomorrow · ${monthDay}`;
  }

  return `${dayName} · ${monthDay}`;
}

function isDateInPast(date: Date, today: Date): boolean {
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return dateStart < todayStart;
}

export default function WeekScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const toggleTask = useToggleTask();
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

  const now = new Date();
  const weekStart = React.useMemo(() => getMonday(now), []);

  // Group tasks by day of the week
  const { weekDays, overdueTasks, totalWeekTasks } = React.useMemo(() => {
    const monday = getMonday(now);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Create array of 7 days starting from Monday
    const days: { date: Date; tasks: Task[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      days.push({ date: day, tasks: [] });
    }

    const overdue: Task[] = [];
    let weekTotal = 0;

    tasks.forEach((task) => {
      // Exclude subtasks
      if (task.parentTaskId) return;
      // Exclude completed tasks
      if (task.status === 'completed') return;
      // Only tasks with due dates
      if (!task.dueDate) return;

      const dueDate = new Date(task.dueDate);
      const dueDateStart = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

      // Check if overdue (before today)
      if (dueDateStart < todayStart) {
        overdue.push(task);
        return;
      }

      // Check if within this week
      const weekEnd = new Date(monday);
      weekEnd.setDate(monday.getDate() + 7);

      if (dueDateStart >= monday && dueDateStart < weekEnd) {
        // Find which day this task belongs to
        const dayIndex = Math.floor((dueDateStart.getTime() - monday.getTime()) / (1000 * 60 * 60 * 24));
        if (dayIndex >= 0 && dayIndex < 7) {
          days[dayIndex].tasks.push(task);
          weekTotal++;
        }
      }
    });

    return { weekDays: days, overdueTasks: overdue, totalWeekTasks: weekTotal };
  }, [tasks, now]);

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

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </SafeAreaView>
    );
  }

  const totalTasks = totalWeekTasks + overdueTasks.length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-8">
        <View className="flex-row items-center gap-3">
          <UserMenu />
          <View>
            <Text className="text-2xl font-bold">Week</Text>
            <Text className="text-sm text-muted-foreground">
              {totalTasks} task{totalTasks !== 1 ? 's' : ''} this week
            </Text>
          </View>
        </View>
        <ThemeToggle />
      </View>

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

        {/* Week days */}
        {weekDays.map((day, dayIndex) => {
          const isPast = isDateInPast(day.date, now);
          const hasTasks = day.tasks.length > 0;

          return (
            <View key={dayIndex} className="mb-4">
              <View className="px-4 py-2">
                <Text
                  className={`text-sm font-semibold ${
                    isPast ? 'text-muted-foreground' : 'text-foreground'
                  }`}
                >
                  {formatDayHeader(day.date, now)}
                  {hasTasks ? ` (${day.tasks.length})` : ''}
                </Text>
              </View>
              {hasTasks ? (
                day.tasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    subtaskProgress={getSubtaskProgress(tasks, task.id)}
                    onPress={() => handleTaskPress(task)}
                    onToggle={() => handleTaskToggle(task.id)}
                    isLast={index === day.tasks.length - 1}
                  />
                ))
              ) : (
                <View className="px-4 py-3">
                  <Text className="text-sm text-muted-foreground italic">
                    No tasks scheduled
                  </Text>
                </View>
              )}
            </View>
          );
        })}

        {/* Bottom padding */}
        <View className="h-32" />
      </ScrollView>

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
