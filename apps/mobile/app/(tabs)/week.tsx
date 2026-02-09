import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { MilestoneGroup } from '@/components/MilestoneGroup';
import { TaskSheet } from '@/components/TaskSheet';
import { useUser } from '@clerk/clerk-expo';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks, useToggleTask, useDeleteTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useAllMilestones } from '@/hooks/useMilestones';
import { useSheetStore } from '@/stores/sheetStore';
import type { Task } from '@lucidity/shared';

export default function MilestonesScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: milestones = [], isLoading: milestonesLoading, refetch: refetchMilestones } = useAllMilestones();
  const toggleTask = useToggleTask();
  const deleteTask = useDeleteTask();
  const { openSheet } = useSheetStore();

  const projects = React.useMemo(
    () => allProjects.filter((p) => !p.isArchived),
    [allProjects]
  );

  const isLoading = tasksLoading || projectsLoading || milestonesLoading;
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTasks(), refetchProjects(), refetchMilestones()]);
    setRefreshing(false);
  }, [refetchTasks, refetchProjects, refetchMilestones]);

  // Group tasks by milestone
  const tasksByMilestone = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const milestone of milestones) {
      map.set(milestone.id, []);
    }
    for (const task of tasks) {
      if (task.milestoneId && map.has(task.milestoneId)) {
        map.get(task.milestoneId)!.push(task);
      }
    }
    return map;
  }, [tasks, milestones]);

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

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId);
    },
    [deleteTask]
  );

  // Close task sheet if task was deleted
  const { currentTask } = useSheetStore();
  const sheetTask = currentTask();

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-2 pb-8">
        <View className="flex-row items-center gap-3">
          <UserMenu />
          <View>
            <Text className="text-2xl font-bold">Milestones</Text>
            <Text className="text-sm text-muted-foreground">
              {milestones.length} milestone{milestones.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
        <ThemeToggle />
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {milestones.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground">No milestones yet</Text>
          </View>
        ) : (
          milestones.map((milestone) => (
            <MilestoneGroup
              key={milestone.id}
              milestone={milestone}
              project={projects.find((p) => p.id === milestone.projectId)}
              tasks={tasksByMilestone.get(milestone.id) ?? []}
              allTasks={tasks}
              onTaskPress={handleTaskPress}
              onTaskToggle={handleTaskToggle}
              onDeleteTask={handleDeleteTask}
            />
          ))
        )}

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
