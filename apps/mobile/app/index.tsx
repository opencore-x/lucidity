import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { ProjectGroup } from '@/components/ProjectGroup';
import { EmptyState } from '@/components/EmptyState';
import { TaskSheet } from '@/components/TaskSheet';
import { AddProjectRow } from '@/components/AddProjectRow';
import { useUser } from '@clerk/clerk-expo';
import { Stack } from 'expo-router';
import { MoonStarIcon, SunIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { useTasks, useToggleTask, useReorderTasks, useDeleteTask } from '@/hooks/useTasks';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const SCREEN_OPTIONS = {
  headerShown: false,
};

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const toggleTask = useToggleTask();
  const reorderTasks = useReorderTasks();
  const deleteTask = useDeleteTask();
  const deleteProject = useDeleteProject();
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

  const handleTaskPress = React.useCallback(
    (task: Task) => {
      openSheet(task);
    },
    [openSheet]
  );

  const handleDeleteProject = React.useCallback(
    (projectId: string) => {
      deleteProject.mutate(projectId);
    },
    [deleteProject]
  );

  const handleTaskToggle = React.useCallback(
    (taskId: string) => {
      toggleTask.mutate(taskId);
    },
    [toggleTask]
  );

  const handleReorderTasks = React.useCallback(
    (taskIds: string[]) => {
      reorderTasks.mutate(taskIds);
    },
    [reorderTasks]
  );

  const handleDeleteTask = React.useCallback(
    (taskId: string) => {
      deleteTask.mutate(taskId);
    },
    [deleteTask]
  );

  const groupedTasks = React.useMemo(
    () => groupTasksByProject(tasks, projects),
    [tasks, projects]
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
      <>
        <Stack.Screen options={SCREEN_OPTIONS} />
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </>
    );
  }

  const hasNoTasks = tasks.filter((t) => !t.parentTaskId).length === 0;

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        {/* Header with avatar, greeting, theme toggle and new project button */}
        <View className="px-4 pt-2 pb-4">
          {/* Top row: Theme toggle on right */}
          <View className="flex-row justify-end mb-2">
            <ThemeToggle />
          </View>

          {/* Main header row */}
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <UserMenu />
              <View>
                <Text className="text-2xl font-bold">Hello, {displayName.split(' ')[0]}</Text>
                <Text className="text-sm text-muted-foreground">
                  {tasks.filter((t) => t.status !== 'completed' && !t.parentTaskId).length} tasks remaining
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Task list */}
        {hasNoTasks ? (
          <EmptyState />
        ) : (
          <ScrollProvider scrollViewRef={scrollViewRef}>
            <ScrollView
              ref={scrollViewRef}
              className="flex-1"
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
              }
              keyboardShouldPersistTaps="handled"
            >
              {Array.from(groupedTasks.entries()).map(([project, projectTasks]) => (
                <ProjectGroup
                  key={project.id}
                  project={project}
                  tasks={projectTasks}
                  allTasks={tasks}
                  onDeleteProject={handleDeleteProject}
                  onTaskPress={handleTaskPress}
                  onTaskToggle={handleTaskToggle}
                  onReorderTasks={handleReorderTasks}
                  onDeleteTask={handleDeleteTask}
                />
              ))}
              {/* Add Project row */}
              <AddProjectRow />
              {/* Bottom padding for keyboard */}
              <View className="h-80" />
            </ScrollView>
          </ScrollProvider>
        )}

        {/* Task Sheet */}
        <TaskSheet tasks={tasks} projects={projects} />
      </SafeAreaView>
    </>
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
