import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Host, HStack, Button } from '@expo/ui/swift-ui';
import {
  buttonStyle,
  tint,
  controlSize,
  padding,
} from '@expo/ui/swift-ui/modifiers';
import { PlusIcon } from 'lucide-react-native';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { LARGE_TITLE_SCREEN_OPTIONS } from '@/lib/headerConfig';
import { ProjectSheet } from '@/components/ProjectSheet';
import { InlineTaskInput } from '@/components/InlineTaskInput';
import {
  DraggableTask,
  SwipeableCompletedTask,
  DropIndicator,
} from '@/components/ProjectGroup';
import { useProject } from '@/hooks/useProjects';
import { useTasks, useCreateTask, useToggleTask, useUpdateTask, useReorderTasks } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { formatRelativeTime } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: allTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], refetch: refetchProjects } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const reorderTasks = useReorderTasks();
  const { deleteTask } = useUndoableDeleteTask();
  const { openSheet } = useSheetStore();
  const scrollViewRef = React.useRef<ScrollView>(null);

  const projects = React.useMemo(
    () => allProjects.filter((p) => !p.isArchived),
    [allProjects]
  );

  const rootTasks = React.useMemo(
    () => allTasks.filter((t) => t.projectId === id && !t.parentTaskId),
    [allTasks, id]
  );

  const activeTasks = React.useMemo(
    () => rootTasks.filter((t) => t.status !== 'completed'),
    [rootTasks]
  );

  const completedTasks = React.useMemo(
    () =>
      rootTasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => {
          const aTime = new Date(a.completedAt ?? 0).getTime();
          const bTime = new Date(b.completedAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [rootTasks]
  );

  const [localTasks, setLocalTasks] = React.useState(activeTasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);
  const [selectedTab, setSelectedTab] = React.useState<'active' | 'completed'>('active');

  React.useEffect(() => {
    setLocalTasks(activeTasks);
  }, [activeTasks]);

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

  const handleReorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      const newTasks = [...localTasks];
      const [moved] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, moved);
      setLocalTasks(newTasks);
      reorderTasks.mutate(newTasks.map((t) => t.id));
    },
    [localTasks, reorderTasks]
  );

  const handleDragStart = React.useCallback((index: number) => {
    setIsDragging(true);
    setDragFromIndex(index);
    setDropIndex(index);
  }, []);

  const handleDragUpdate = React.useCallback((targetIndex: number) => {
    setDropIndex(targetIndex);
  }, []);

  const handleCreateTask = React.useCallback(() => {
    Alert.prompt('New Task', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add Task',
        onPress: (title?: string) => {
          if (title?.trim()) {
            createTask.mutate({ title: title.trim(), projectId: id });
          }
        },
      },
    ], 'plain-text');
  }, [createTask, id]);

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
    setDropIndex(null);
    setDragFromIndex(null);
  }, []);

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: '' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Stack.Screen options={{ ...LARGE_TITLE_SCREEN_OPTIONS, title: 'Not Found' }} />
        <View className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted-foreground">Project not found</Text>
        </View>
      </>
    );
  }


  return (
    <>
      <Stack.Screen
        options={{
          ...LARGE_TITLE_SCREEN_OPTIONS,
          title: project.name,
          headerTintColor: project.color ?? undefined,
          headerRight: () => (
            <View className="flex-row items-center gap-4">
              <Pressable onPress={handleCreateTask} hitSlop={8} className="pl-2">
                <Icon as={PlusIcon} className="size-6 text-foreground" />
              </Pressable>
              <UserMenu />
            </View>
          ),
        }}
      />
      <SafeAreaView style={{ flex: 1 }} className="bg-background" edges={['bottom']}>
        <ScrollProvider scrollViewRef={scrollViewRef}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1 bg-background"
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Project info */}
          {project.description ? (
            <View className="px-4 pt-2 pb-2">
              <Text className="text-sm text-muted-foreground">
                {project.description}
              </Text>
            </View>
          ) : null}

          {/* Filter tabs — native @expo/ui Liquid Glass buttons (iOS 26+) */}
          <Host matchContents style={{ paddingTop: 4, paddingBottom: 4 }}>
            <HStack spacing={8} modifiers={[padding({ horizontal: 16, vertical: 6 })]}>
              <Button
                label={`Active (${activeTasks.length})`}
                onPress={() => setSelectedTab('active')}
                modifiers={[
                  controlSize('small'),
                  buttonStyle(
                    selectedTab === 'active' ? 'glassProminent' : 'glass'
                  ),
                  ...(project?.color ? [tint(project.color)] : []),
                ]}
              />
              <Button
                label={`Completed (${completedTasks.length})`}
                onPress={() => setSelectedTab('completed')}
                modifiers={[
                  controlSize('small'),
                  buttonStyle(
                    selectedTab === 'completed' ? 'glassProminent' : 'glass'
                  ),
                  ...(project?.color ? [tint(project.color)] : []),
                ]}
              />
            </HStack>
          </Host>

          {selectedTab === 'active' ? (
            <>
              {/* Active tasks with drag/drop */}
              {localTasks.map((task, index) => (
                <React.Fragment key={task.id}>
                  <DropIndicator
                    visible={
                      isDragging &&
                      dropIndex === index &&
                      dragFromIndex !== null &&
                      dragFromIndex > index
                    }
                  />
                  <DraggableTask
                    task={task}
                    index={index}
                    tasksCount={localTasks.length}
                    allTasks={allTasks}
                    isLast={index === localTasks.length - 1}
                    onTaskPress={handleTaskPress}
                    onTaskToggle={handleTaskToggle}
                    onReorder={handleReorder}
                    onDragStart={() => handleDragStart(index)}
                    onDragUpdate={handleDragUpdate}
                    onDragEnd={handleDragEnd}
                    onDeleteTask={handleDeleteTask}
                    onSetDueToday={handleSetDueToday}
                  />
                  <DropIndicator
                    visible={
                      isDragging &&
                      dropIndex === index &&
                      dragFromIndex !== null &&
                      dragFromIndex < index
                    }
                  />
                </React.Fragment>
              ))}
              <DropIndicator
                visible={
                  isDragging &&
                  dropIndex === localTasks.length - 1 &&
                  dragFromIndex !== null &&
                  dragFromIndex < localTasks.length - 1
                }
              />

              {/* Inline task input */}
              <InlineTaskInput projectId={id} onComplete={() => {}} />
            </>
          ) : (
            <>
              {/* Completed tasks */}
              {completedTasks.length === 0 ? (
                <View className="items-center justify-center py-20">
                  <Text className="text-muted-foreground">No completed tasks</Text>
                </View>
              ) : (
                completedTasks.map((task, index) => (
                  <View key={task.id} className="flex-row items-center">
                    <View className="flex-1">
                      <SwipeableCompletedTask
                        task={task}
                        allTasks={allTasks}
                        isLast={index === completedTasks.length - 1}
                        onTaskPress={handleTaskPress}
                        onTaskToggle={handleTaskToggle}
                        onDeleteTask={handleDeleteTask}
                      />
                    </View>
                    {task.completedAt && (
                      <Text className="text-xs text-muted-foreground pr-4 shrink-0">
                        {formatRelativeTime(task.completedAt)}
                      </Text>
                    )}
                  </View>
                ))
              )}
            </>
          )}

          {/* Bottom padding for keyboard */}
          <View className="h-80" />
        </ScrollView>
        </ScrollProvider>

        {/* Sheets */}
        <ProjectSheet />
      </SafeAreaView>
    </>
  );
}
