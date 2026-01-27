import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ProjectGroup } from '@/components/ProjectGroup';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { TaskSheet } from '@/components/TaskSheet';
import { CreateProjectModal } from '@/components/CreateProjectModal';
import { useTasks, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import { Sun, Moon } from '@/lib/icons';
import type { Task } from '@opentask/shared';

export function HomeScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const { colorScheme, toggleColorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [refreshing, setRefreshing] = React.useState(false);
  const [showCreateProject, setShowCreateProject] = React.useState(false);

  const { openSheet, openCreateSheet } = useSheetStore();
  const toggleTask = useToggleTask();

  const isLoading = tasksLoading || projectsLoading;

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
    // Open create sheet for the first project (Todo should be first)
    const todoProject = projects.find((p) => p.name === 'Todo') || projects[0];
    if (todoProject) {
      openCreateSheet(todoProject.id);
    }
  }, [projects, openCreateSheet]);

  const groupedTasks = React.useMemo(
    () => groupTasksByProject(tasks, projects),
    [tasks, projects]
  );

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#3B82F6" />
        <Text className="mt-4 text-muted-foreground">Loading...</Text>
      </SafeAreaView>
    );
  }

  const hasProjects = projects.length > 0;
  const hasTasks = tasks.length > 0;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="px-4 py-4 border-b border-border">
        <View className="flex-row items-center justify-between">
          <Text className="text-2xl font-bold">Tasks</Text>
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={toggleColorScheme}
              className="p-2 rounded-full bg-secondary"
            >
              {isDark ? (
                <Sun size={18} className="text-foreground" />
              ) : (
                <Moon size={18} className="text-foreground" />
              )}
            </Pressable>
            <Button variant="ghost" size="sm" onPress={() => signOut()}>
              Sign Out
            </Button>
          </View>
        </View>
        {user && (
          <Text className="text-sm text-muted-foreground mt-1">
            {user.fullName || user.primaryEmailAddress?.emailAddress}
          </Text>
        )}
      </View>

      {/* Action Bar */}
      <View className="px-4 py-3 flex-row justify-end border-b border-border">
        <Button
          variant="outline"
          size="sm"
          onPress={() => setShowCreateProject(true)}
        >
          + New Project
        </Button>
      </View>

      {/* Content */}
      {!hasProjects ? (
        <EmptyState
          title="Welcome to OpenTask"
          message="Create a project to get started"
        />
      ) : !hasTasks ? (
        <EmptyState
          title="No tasks yet"
          message="Tap the + button to add your first task"
        />
      ) : (
        <ScrollView
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          contentContainerStyle={{ paddingBottom: 100 }}
        >
          {Array.from(groupedTasks.entries()).map(([project, projectTasks]) => (
            <ProjectGroup
              key={project.id}
              project={project}
              tasks={projectTasks}
              allTasks={tasks}
              onAddTask={handleAddTask}
              onTaskPress={handleTaskPress}
              onTaskToggle={handleTaskToggle}
            />
          ))}
        </ScrollView>
      )}

      {/* FAB */}
      {hasProjects && <FAB onPress={handleFABPress} />}

      {/* Task Sheet */}
      <TaskSheet tasks={tasks} projects={projects} />

      {/* Create Project Modal */}
      <CreateProjectModal
        visible={showCreateProject}
        onClose={() => setShowCreateProject(false)}
      />
    </SafeAreaView>
  );
}
