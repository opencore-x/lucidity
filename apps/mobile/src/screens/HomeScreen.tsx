import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { ProjectGroup } from '@/components/ProjectGroup';
import { EmptyState } from '@/components/EmptyState';
import { FAB } from '@/components/FAB';
import { TaskSheet } from '@/components/TaskSheet';
import { useTasks, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import type { Task } from '@opentask/shared';

export function HomeScreen() {
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: projects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const [refreshing, setRefreshing] = React.useState(false);

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
        <Text className="text-2xl font-bold">Tasks</Text>
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
    </SafeAreaView>
  );
}
