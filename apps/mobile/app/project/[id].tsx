import * as React from 'react';
import { View, ScrollView, RefreshControl, ActivityIndicator, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack, useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { TaskSheet } from '@/components/TaskSheet';
import { ProjectSheet } from '@/components/ProjectSheet';
import { InlineTaskInput } from '@/components/InlineTaskInput';
import {
  DraggableTask,
  SwipeableCompletedTask,
  DropIndicator,
} from '@/components/ProjectGroup';
import { useProject } from '@/hooks/useProjects';
import { useTasks, useToggleTask, useUpdateTask, useReorderTasks } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { ScrollProvider } from '@/contexts/ScrollContext';
import { ChevronRight } from '@/lib/icons';
import { formatRelativeTime } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const INITIAL_COMPLETED_COUNT = 2;

export default function ProjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: project, isLoading: projectLoading } = useProject(id);
  const { data: allTasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], refetch: refetchProjects } = useProjects();
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
  const [completedExpanded, setCompletedExpanded] = React.useState(true);
  const [showAllCompleted, setShowAllCompleted] = React.useState(false);

  const visibleCompleted = showAllCompleted
    ? completedTasks
    : completedTasks.slice(0, INITIAL_COMPLETED_COUNT);
  const hiddenCount = completedTasks.length - INITIAL_COMPLETED_COUNT;

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

  const handleDragEnd = React.useCallback(() => {
    setIsDragging(false);
    setDropIndex(null);
    setDragFromIndex(null);
  }, []);

  const { currentTask } = useSheetStore();
  const sheetTask = currentTask();

  React.useEffect(() => {
    if (sheetTask && !allTasks.find((t) => t.id === sheetTask.id)) {
      useSheetStore.getState().closeSheet();
    }
  }, [sheetTask, allTasks]);

  const isLoading = projectLoading || tasksLoading;

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: '' }} />
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </>
    );
  }

  if (!project) {
    return (
      <>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <SafeAreaView className="flex-1 items-center justify-center bg-background">
          <Text className="text-muted-foreground">Project not found</Text>
        </SafeAreaView>
      </>
    );
  }

  const activeCount = activeTasks.length;

  return (
    <>
      <Stack.Screen
        options={{
          title: project.name,
          headerTintColor: project.color ?? undefined,
        }}
      />
      <SafeAreaView className="flex-1 bg-background" edges={['bottom']}>
        <ScrollProvider scrollViewRef={scrollViewRef}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
          {/* Project info */}
          <View className="px-4 pt-2 pb-4">
            {project.description ? (
              <Text className="text-sm text-muted-foreground mb-2">
                {project.description}
              </Text>
            ) : null}
            <Text className="text-sm text-muted-foreground">
              {activeCount} task{activeCount !== 1 ? 's' : ''} remaining
            </Text>
          </View>

          {/* Recently completed section */}
          {completedTasks.length > 0 && (
            <View>
              <Pressable
                onPress={() => setCompletedExpanded(!completedExpanded)}
                className="flex-row items-center px-4 py-2.5"
              >
                <ChevronRight
                  size={14}
                  color="#9CA3AF"
                  style={{ transform: [{ rotate: completedExpanded ? '90deg' : '0deg' }] }}
                />
                <Text className="text-xs text-muted-foreground ml-1.5">
                  Recently completed ({completedTasks.length})
                </Text>
              </Pressable>

              {completedExpanded && (
                <>
                  {visibleCompleted.map((task, index) => (
                    <View key={task.id} className="flex-row items-center">
                      <View className="flex-1">
                        <SwipeableCompletedTask
                          task={task}
                          allTasks={allTasks}
                          isLast={
                            index === visibleCompleted.length - 1 && hiddenCount <= 0
                          }
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
                  ))}
                  {!showAllCompleted && hiddenCount > 0 && (
                    <Pressable
                      onPress={() => setShowAllCompleted(true)}
                      className="px-4 py-2"
                    >
                      <Text className="text-xs text-blue-500">
                        Show {hiddenCount} more
                      </Text>
                    </Pressable>
                  )}
                </>
              )}
            </View>
          )}

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

          {/* Bottom padding for keyboard */}
          <View className="h-80" />
        </ScrollView>
        </ScrollProvider>

        {/* Sheets */}
        <ProjectSheet />
        <TaskSheet tasks={allTasks} projects={projects} />
      </SafeAreaView>
    </>
  );
}
