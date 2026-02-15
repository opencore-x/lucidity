import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { UserMenu } from '@/components/user-menu';
import { TaskItem } from '@/components/TaskItem';
import { TaskSheet } from '@/components/TaskSheet';
import { useColorScheme } from 'nativewind';
import { PlusIcon } from 'lucide-react-native';
import * as React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useTasks, useCreateTask, useToggleTask } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtaskProgress } from '@/utils/helpers';
import { Search, X } from '@/lib/icons';
import type { Task, Project } from '@lucidity/shared';

export default function SearchScreen() {
  const { colorScheme } = useColorScheme();
  const router = useRouter();
  const inputRef = React.useRef<TextInput>(null);

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useTasks();
  const { data: allProjects = [], isLoading: projectsLoading, refetch: refetchProjects } = useProjects();
  const createTask = useCreateTask();
  const toggleTask = useToggleTask();
  const { openSheet } = useSheetStore();

  const projects = React.useMemo(
    () => allProjects.filter((p) => !p.isArchived),
    [allProjects]
  );

  const isLoading = tasksLoading || projectsLoading;
  const [refreshing, setRefreshing] = React.useState(false);
  const [query, setQuery] = React.useState('');

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchTasks(), refetchProjects()]);
    setRefreshing(false);
  }, [refetchTasks, refetchProjects]);

  const filteredTasks = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return tasks.filter((task) => {
      if (task.parentTaskId) return false;
      return (
        task.title.toLowerCase().includes(q) ||
        (task.description && task.description.toLowerCase().includes(q))
      );
    });
  }, [tasks, query]);

  const filteredProjects = React.useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return projects.filter((p) => p.name.toLowerCase().includes(q));
  }, [projects, query]);

  const recentTasks = React.useMemo(() => {
    return tasks
      .filter((t) => !t.parentTaskId && t.status !== 'completed')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 20);
  }, [tasks]);

  const projectTaskCounts = React.useMemo(() => {
    const counts = new Map<string, number>();
    tasks.forEach((t) => {
      if (t.projectId && !t.parentTaskId && t.status !== 'completed') {
        counts.set(t.projectId, (counts.get(t.projectId) || 0) + 1);
      }
    });
    return counts;
  }, [tasks]);

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

  const handleProjectPress = React.useCallback(
    () => {
      router.navigate('/');
    },
    [router]
  );

  const handleCreateTask = React.useCallback(() => {
    Alert.prompt('New Task', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Add Task',
        onPress: (title?: string) => {
          if (title?.trim()) {
            createTask.mutate({ title: title.trim() });
          }
        },
      },
    ], 'plain-text');
  }, [createTask]);

  const handleClear = React.useCallback(() => {
    setQuery('');
    inputRef.current?.focus();
  }, []);

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
        <Pressable onPress={handleCreateTask} hitSlop={8} className="pl-2">
          <Icon as={PlusIcon} className="size-6 text-foreground" />
        </Pressable>
        <UserMenu />
      </View>
    ),
    [handleCreateTask]
  );

  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ title: 'Search', headerRight }} />
        <View className="flex-1 items-center justify-center bg-background">
          <ActivityIndicator size="large" />
        </View>
      </>
    );
  }

  const hasQuery = query.trim().length > 0;
  const noResults = hasQuery && filteredTasks.length === 0 && filteredProjects.length === 0;

  return (
    <>
      <Stack.Screen options={{ title: 'Search', headerRight }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      >
        {/* Search input */}
        <View className="px-4 pt-3 pb-4">
          <View className="flex-row items-center bg-muted rounded-lg px-3 py-2 gap-2">
            <Search size={18} className="text-muted-foreground" />
            <TextInput
              ref={inputRef}
              className="flex-1 text-base text-foreground font-sans"
              placeholder="Search tasks and projects..."
              placeholderTextColor={colorScheme === 'dark' ? '#71717a' : '#a1a1aa'}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
              returnKeyType="search"
            />
            {hasQuery && (
              <Pressable onPress={handleClear} hitSlop={8}>
                <X size={18} className="text-muted-foreground" />
              </Pressable>
            )}
          </View>
        </View>

        {hasQuery ? (
          <>
            {filteredProjects.length > 0 && (
              <View className="mb-4">
                <View className="px-4 py-2">
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Projects ({filteredProjects.length})
                  </Text>
                </View>
                {filteredProjects.map((project) => (
                  <Pressable
                    key={project.id}
                    onPress={handleProjectPress}
                    className="flex-row items-center px-4 py-3 gap-3 active:opacity-70"
                  >
                    <View
                      style={{ backgroundColor: project.color || '#6366F1' }}
                      className="w-3 h-3 rounded-full"
                    />
                    <Text className="text-base flex-1" numberOfLines={1}>
                      {project.name}
                    </Text>
                    <Text className="text-sm text-muted-foreground">
                      {projectTaskCounts.get(project.id) || 0} tasks
                    </Text>
                  </Pressable>
                ))}
              </View>
            )}

            {filteredTasks.length > 0 && (
              <View className="mb-4">
                <View className="px-4 py-2">
                  <Text className="text-sm font-semibold text-muted-foreground">
                    Tasks ({filteredTasks.length})
                  </Text>
                </View>
                {filteredTasks.map((task, index) => (
                  <TaskItem
                    key={task.id}
                    task={task}
                    subtaskProgress={getSubtaskProgress(tasks, task.id)}
                    onPress={() => handleTaskPress(task)}
                    onToggle={() => handleTaskToggle(task.id)}
                    isLast={index === filteredTasks.length - 1}
                  />
                ))}
              </View>
            )}

            {noResults && (
              <View className="items-center justify-center px-8 pt-16">
                <Text className="text-lg font-semibold text-center mb-2">No results</Text>
                <Text className="text-muted-foreground text-center">
                  Nothing matched "{query}"
                </Text>
              </View>
            )}
          </>
        ) : (
          <View className="mb-4">
            <View className="px-4 py-2">
              <Text className="text-sm font-semibold text-muted-foreground">
                Recent Tasks
              </Text>
            </View>
            {recentTasks.map((task, index) => (
              <TaskItem
                key={task.id}
                task={task}
                subtaskProgress={getSubtaskProgress(tasks, task.id)}
                onPress={() => handleTaskPress(task)}
                onToggle={() => handleTaskToggle(task.id)}
                isLast={index === recentTasks.length - 1}
              />
            ))}
            {recentTasks.length === 0 && (
              <View className="items-center justify-center px-8 pt-16">
                <Text className="text-muted-foreground text-center">
                  No tasks yet
                </Text>
              </View>
            )}
          </View>
        )}

        <View className="h-32" />
      </ScrollView>

      <TaskSheet tasks={tasks} projects={projects} />
    </>
  );
}
