import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { ProjectGroup } from '@/components/ProjectGroup';
import { TaskSheet } from '@/components/TaskSheet';
import { useUser } from '@clerk/clerk-expo';
import { MoonStarIcon, SunIcon, ChevronsDownUpIcon, ChevronsUpDownIcon } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { useTasks, useToggleTask, useUpdateTask, useReorderTasks } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects, useDeleteProject } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

export default function ProjectsScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const {
    data: allProjects = [],
    isLoading: projectsLoading,
    refetch: refetchProjects,
  } = useProjects();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const { deleteTask } = useUndoableDeleteTask();
  const deleteProject = useDeleteProject();
  const { openSheet } = useSheetStore();

  // Filter out archived projects
  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);

  const isLoading = tasksLoading || projectsLoading;
  const [refreshing, setRefreshing] = React.useState(false);
  const [expandAll, setExpandAll] = React.useState<boolean | null>(null);

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
      deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleSetDueToday = React.useCallback(
    (taskId: string) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      updateTask.mutate({ id: taskId, data: { dueDate: today } });
    },
    [updateTask]
  );

  const groupedTasks = React.useMemo(() => groupTasksByProject(tasks, projects), [tasks, projects]);

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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header with avatar, greeting, and theme toggle */}
      <View className="flex-row items-center justify-between px-4 pb-8 pt-2">
        <View className="flex-row items-center gap-3">
          <UserMenu />
          <View>
            <Text className="text-2xl font-bold">Projects</Text>
            <Text className="text-sm text-muted-foreground">
              {tasks.filter((t) => t.status !== 'completed' && !t.parentTaskId).length} tasks
              remaining
            </Text>
          </View>
        </View>
        <ThemeToggle />
      </View>

      {/* Task list - always show Inbox + projects */}
      <ScrollProvider scrollViewRef={scrollViewRef}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View className="flex-row justify-end px-4 pb-2">
            <Button
              size="icon"
              variant="ghost"
              className="rounded-full"
              onPress={() => setExpandAll(prev => (prev === null ? true : !prev))}>
              <Icon
                as={expandAll ? ChevronsDownUpIcon : ChevronsUpDownIcon}
                className="size-5 text-muted-foreground"
              />
            </Button>
          </View>
          {Array.from(groupedTasks.entries()).map(([project, projectTasks]) => (
            <ProjectGroup
              key={project.id}
              project={project}
              tasks={projectTasks}
              allTasks={tasks}
              expandAll={expandAll}
              onDeleteProject={handleDeleteProject}
              onTaskPress={handleTaskPress}
              onTaskToggle={handleTaskToggle}
              onReorderTasks={handleReorderTasks}
              onDeleteTask={handleDeleteTask}
              onSetDueToday={handleSetDueToday}
            />
          ))}
          {/* Bottom padding for keyboard */}
          <View className="h-80" />
        </ScrollView>
      </ScrollProvider>

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
