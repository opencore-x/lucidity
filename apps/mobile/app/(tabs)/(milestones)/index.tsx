import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { MilestoneGroup } from '@/components/MilestoneGroup';
import { TaskSheet } from '@/components/TaskSheet';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert, ActionSheetIOS } from 'react-native';
import { Stack } from 'expo-router';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { useTasks, useToggleTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects } from '@/hooks/useProjects';
import { useAllMilestones, useCreateMilestone } from '@/hooks/useMilestones';
import { useUndoableDeleteMilestone } from '@/hooks/useUndoableDeleteMilestone';
import { useSheetStore } from '@/stores/sheetStore';
import { useQueryClient } from '@tanstack/react-query';
import type { Task } from '@lucidity/shared';

export default function MilestonesScreen() {
  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const { data: milestones = [], isLoading: milestonesLoading, refetch: refetchMilestones } = useAllMilestones();
  const createMilestone = useCreateMilestone();
  const { deleteMilestone } = useUndoableDeleteMilestone();
  const toggleTask = useToggleTask();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();
  const queryClient = useQueryClient();

  const projects = React.useMemo(
    () => allProjects.filter((p) => !p.isArchived),
    [allProjects]
  );

  const scrollViewRef = React.useRef<ScrollView>(null);
  const isLoading = tasksLoading || projectsLoading || milestonesLoading;
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedProjectId, setSelectedProjectId] = React.useState<string | null>(null);

  const projectsWithMilestones = React.useMemo(() => {
    const projectIds = new Set(milestones.map((m) => m.projectId));
    return projects.filter((p) => projectIds.has(p.id));
  }, [milestones, projects]);

  const filteredMilestones = React.useMemo(
    () =>
      selectedProjectId
        ? milestones.filter((m) => m.projectId === selectedProjectId)
        : milestones,
    [milestones, selectedProjectId]
  );

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    queryClient.invalidateQueries({ queryKey: ['milestoneProgress'] });
    await Promise.all([refetchTasks(), refetchProjects(), refetchMilestones()]);
    setRefreshing(false);
  }, [refetchTasks, refetchProjects, refetchMilestones, queryClient]);

  const tasksByMilestone = React.useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const milestone of filteredMilestones) {
      map.set(milestone.id, []);
    }
    for (const task of tasks) {
      if (task.milestoneId && map.has(task.milestoneId)) {
        map.get(task.milestoneId)!.push(task);
      }
    }
    return map;
  }, [tasks, filteredMilestones]);

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
      deleteTask(taskId);
    },
    [deleteTask]
  );

  const handleDeleteMilestone = React.useCallback(
    (milestoneId: string) => {
      deleteMilestone(milestoneId);
    },
    [deleteMilestone]
  );

  const promptMilestoneName = React.useCallback(
    (projectId: string, projectName: string) => {
      Alert.prompt(
        'New Milestone',
        `In project: ${projectName}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add Milestone',
            onPress: (name?: string) => {
              if (name?.trim()) {
                createMilestone.mutate({ projectId, name: name.trim() });
              }
            },
          },
        ],
        'plain-text'
      );
    },
    [createMilestone]
  );

  const handleCreateMilestone = React.useCallback(() => {
    if (projects.length === 0) {
      Alert.alert('No Projects', 'Create a project first to add milestones.');
      return;
    }
    if (selectedProjectId) {
      const project = projects.find((p) => p.id === selectedProjectId);
      promptMilestoneName(selectedProjectId, project?.name ?? 'Unknown');
      return;
    }
    const options = [...projects.map((p) => p.name), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options, cancelButtonIndex: options.length - 1, title: 'Select a project' },
      (index) => {
        if (index < projects.length) {
          promptMilestoneName(projects[index].id, projects[index].name);
        }
      }
    );
  }, [projects, selectedProjectId, promptMilestoneName]);

  const { currentTask } = useSheetStore();
  const sheetTask = currentTask();

  React.useEffect(() => {
    if (sheetTask && !tasks.find((t) => t.id === sheetTask.id)) {
      useSheetStore.getState().closeSheet();
    }
  }, [sheetTask, tasks]);

  const headerRight = React.useCallback(
    () => (
      <View className="flex-row items-center gap-4">
        <Pressable onPress={handleCreateMilestone} hitSlop={8} className="pl-2">
          <Icon as={PlusIcon} className="size-6 text-foreground" />
        </Pressable>
        <UserMenu />
      </View>
    ),
    [handleCreateMilestone]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Milestones', headerRight }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Milestones', headerRight }} />
      <ScrollProvider scrollViewRef={scrollViewRef}>
      <ScrollView
        ref={scrollViewRef}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Project filter tabs */}
        {projectsWithMilestones.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ flexGrow: 0 }}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center', paddingBottom: 12 }}
          >
            <Pressable
              onPress={() => setSelectedProjectId(null)}
              className={`px-3 py-1.5 rounded-full border ${
                selectedProjectId === null
                  ? 'bg-foreground border-foreground'
                  : 'border-border'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedProjectId === null ? 'text-background' : 'text-foreground'
                }`}
              >
                All
              </Text>
            </Pressable>
            {projectsWithMilestones.map((project) => (
              <Pressable
                key={project.id}
                onPress={() =>
                  setSelectedProjectId(
                    selectedProjectId === project.id ? null : project.id
                  )
                }
                className={`px-3 py-1.5 rounded-full border ${
                  selectedProjectId === project.id
                    ? 'bg-foreground border-foreground'
                    : 'border-border'
                }`}
              >
                <Text
                  className={`text-sm font-medium ${
                    selectedProjectId === project.id
                      ? 'text-background'
                      : 'text-foreground'
                  }`}
                >
                  {project.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {filteredMilestones.length === 0 ? (
          <View className="items-center justify-center py-20">
            <Text className="text-muted-foreground">No milestones yet</Text>
          </View>
        ) : (
          filteredMilestones.map((milestone) => (
            <MilestoneGroup
              key={milestone.id}
              milestone={milestone}
              project={projects.find((p) => p.id === milestone.projectId)}
              tasks={tasksByMilestone.get(milestone.id) ?? []}
              allTasks={tasks}
              onTaskPress={handleTaskPress}
              onTaskToggle={handleTaskToggle}
              onDeleteTask={handleDeleteTask}
              onDeleteMilestone={handleDeleteMilestone}
            />
          ))
        )}

        <View className="h-32" />
      </ScrollView>
      </ScrollProvider>

      <TaskSheet tasks={tasks} projects={projects} />
    </>
  );
}
