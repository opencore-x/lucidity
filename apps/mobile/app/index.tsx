import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { ProjectGroup } from '@/components/ProjectGroup';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { TaskSheet } from '@/components/TaskSheet';
import { ProjectSheet } from '@/components/ProjectSheet';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useUser } from '@clerk/clerk-expo';
import { Stack } from 'expo-router';
import { MoonStarIcon, SunIcon, Plus } from 'lucide-react-native';
import { useColorScheme } from 'nativewind';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTasks, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import type { Task, Project } from '@lucidity/shared';

const SCREEN_OPTIONS = {
  headerShown: false,
};

export default function HomeScreen() {
  const { colorScheme } = useColorScheme();
  const { user } = useUser();
  const [showCreateProject, setShowCreateProject] = React.useState(false);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const toggleTask = useToggleTask();
  const { openSheet, openCreateSheet } = useSheetStore();
  const { openSheet: openProjectSheet } = useProjectSheetStore();

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

  const handleProjectPress = React.useCallback(
    (project: Project) => {
      openProjectSheet(project);
    },
    [openProjectSheet]
  );

  const handleTaskToggle = React.useCallback(
    (taskId: string) => {
      toggleTask.mutate(taskId);
    },
    [toggleTask]
  );

  const handleAddTask = React.useCallback(
    (projectId: string) => {
      openCreateSheet(projectId);
    },
    [openCreateSheet]
  );

  const handleFABPress = React.useCallback(() => {
    const defaultProject = projects.find((p) => p.name === 'Todo') || projects[0];
    if (defaultProject) {
      openCreateSheet(defaultProject.id);
    }
  }, [projects, openCreateSheet]);

  const groupedTasks = React.useMemo(
    () => groupTasksByProject(tasks, projects),
    [tasks, projects]
  );

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
            <Button
              variant="outline"
              size="sm"
              onPress={() => setShowCreateProject(true)}
            >
              <Icon as={Plus} className="size-4 mr-1" />
              <Text>New Project</Text>
            </Button>
          </View>
        </View>

        {/* Task list */}
        {hasNoTasks ? (
          <EmptyState />
        ) : (
          <ScrollView
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {Array.from(groupedTasks.entries()).map(([project, projectTasks]) => (
              <ProjectGroup
                key={project.id}
                project={project}
                tasks={projectTasks}
                allTasks={tasks}
                onAddTask={handleAddTask}
                onProjectPress={handleProjectPress}
                onTaskPress={handleTaskPress}
                onTaskToggle={handleTaskToggle}
              />
            ))}
            {/* Bottom padding for FAB */}
            <View className="h-24" />
          </ScrollView>
        )}

        {/* FAB */}
        {projects.length > 0 && <FAB onPress={handleFABPress} />}

        {/* Task Sheet */}
        <TaskSheet tasks={tasks} projects={projects} />

        {/* Project Sheet */}
        <ProjectSheet />

        {/* Create Project Modal */}
        <CreateProjectModal
          visible={showCreateProject}
          onClose={() => setShowCreateProject(false)}
        />
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
