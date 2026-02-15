import { Icon } from '@/components/ui/icon';
import { UserMenu } from '@/components/user-menu';
import { ProjectGroup } from '@/components/ProjectGroup';
import { ProjectSheet } from '@/components/ProjectSheet';
import { TaskSheet } from '@/components/TaskSheet';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { useTasks, useToggleTask, useUpdateTask, useReorderTasks } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects, useCreateProject } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { groupTasksByProject } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

export default function ProjectsScreen() {
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
  const createProject = useCreateProject();
  const { openSheet } = useSheetStore();

  // Filter out archived projects
  const projects = React.useMemo(() => allProjects.filter((p) => !p.isArchived), [allProjects]);

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

  const handleCreateProject = React.useCallback(() => {
    Alert.prompt(
      'New Project',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add Project',
          onPress: (name?: string) => {
            if (name?.trim()) {
              createProject.mutate({ name: name.trim(), isArchived: false });
            }
          },
        },
      ],
      'plain-text'
    );
  }, [createProject]);

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

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-4">
        <Pressable onPress={handleCreateProject} hitSlop={8} className="pl-2">
          <Icon as={PlusIcon} className="size-6 text-foreground" />
        </Pressable>
        <UserMenu />
      </View>
    ),
    [handleCreateProject]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Projects', headerRight }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Projects', headerRight }} />
      <ScrollProvider scrollViewRef={scrollViewRef}>
        <ScrollView
          ref={scrollViewRef}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag">
          <View className="h-4" />
          {Array.from(groupedTasks.entries()).map(([project, projectTasks]) => (
            <ProjectGroup
              key={project.id}
              project={project}
              tasks={projectTasks}
              allTasks={tasks}

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

      {/* Sheets */}
      <ProjectSheet />
      <TaskSheet tasks={tasks} projects={projects} />
    </>
  );
}
