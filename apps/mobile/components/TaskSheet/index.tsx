import * as React from 'react';
import { View, ScrollView, Pressable, TextInput, Keyboard } from 'react-native';
import BottomSheet, {
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { SubtaskItem } from './SubtaskItem';
import { TaskOptions } from './TaskOptions';
import { ChevronLeft, Plus } from '@/lib/icons';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtasks, getSubtaskProgress } from '@/utils/helpers';
import { useToggleTask, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { THEME } from '@/lib/theme';
import Constants from 'expo-constants';
import type { Task, Project, UpdateTask } from '@lucidity/shared';

interface TaskSheetProps {
  tasks: Task[];
  projects: Project[];
}

export function TaskSheet({ tasks, projects }: TaskSheetProps) {
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const [newTaskTitle, setNewTaskTitle] = React.useState('');
  const [editingDescription, setEditingDescription] = React.useState<string | null>(null);
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme ?? 'light'];

  const {
    isOpen,
    mode,
    createProjectId,
    currentTask,
    parentTask,
    canGoBack,
    closeSheet,
    drillDown,
    goBack,
  } = useSheetStore();

  const task = currentTask();
  const parent = parentTask();

  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const snapPoints = React.useMemo(() => ['50%', '90%'], []);

  // Handle sheet open/close
  React.useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.expand();
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSheetChange = React.useCallback(
    (index: number) => {
      if (index === -1) {
        closeSheet();
      }
    },
    [closeSheet]
  );

  const handleToggle = React.useCallback(
    (taskId: string) => {
      toggleTask.mutate(taskId);
    },
    [toggleTask]
  );

  const handleAddSubtask = React.useCallback(() => {
    if (!newSubtaskTitle.trim() || !task) return;

    createTask.mutate(
      {
        title: newSubtaskTitle.trim(),
        projectId: task.projectId,
        parentTaskId: task.id,
        status: 'pending',
        priority: 500,
      },
      {
        onSuccess: () => {
          setNewSubtaskTitle('');
          Keyboard.dismiss();
        },
      }
    );
  }, [newSubtaskTitle, task, createTask]);

  const handleCreateTask = React.useCallback(() => {
    if (!newTaskTitle.trim() || !createProjectId) return;

    createTask.mutate(
      {
        title: newTaskTitle.trim(),
        projectId: createProjectId,
        status: 'pending',
        priority: 500,
      },
      {
        onSuccess: () => {
          setNewTaskTitle('');
          closeSheet();
        },
      }
    );
  }, [newTaskTitle, createProjectId, createTask, closeSheet]);

  const handleUpdateField = React.useCallback(
    (data: Partial<UpdateTask>) => {
      if (!task) return;
      updateTask.mutate({ id: task.id, data });
    },
    [task, updateTask]
  );

  const renderBackdrop = React.useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
      />
    ),
    []
  );

  const project = task
    ? projects.find((p) => p.id === task.projectId)
    : createProjectId
      ? projects.find((p) => p.id === createProjectId)
      : undefined;

  // Create mode
  if (mode === 'create') {
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.border }}
      >
        <BottomSheetView className="flex-1 p-4">
          <Text className="text-lg font-semibold mb-4">
            New Task in {project?.name || 'Project'}
          </Text>

          <Input
            placeholder="Task title"
            value={newTaskTitle}
            onChangeText={setNewTaskTitle}
            autoFocus
            onSubmitEditing={handleCreateTask}
            returnKeyType="done"
          />

          <Button
            className="mt-4"
            onPress={handleCreateTask}
            disabled={!newTaskTitle.trim() || createTask.isPending}
          >
            <Text>{createTask.isPending ? 'Creating...' : 'Create Task'}</Text>
          </Button>
        </BottomSheetView>
      </BottomSheet>
    );
  }

  // View mode (task must exist)
  if (!task) {
    return (
      <BottomSheet
        ref={bottomSheetRef}
        index={-1}
        snapPoints={snapPoints}
        onChange={handleSheetChange}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: theme.card }}
        handleIndicatorStyle={{ backgroundColor: theme.border }}
      >
        <BottomSheetView>{null}</BottomSheetView>
      </BottomSheet>
    );
  }

  const subtasks = getSubtasks(tasks, task.id);
  const isCompleted = task.status === 'completed';

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={snapPoints}
      onChange={handleSheetChange}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
    >
      <BottomSheetScrollView className="flex-1">
        {/* Back button */}
        {canGoBack() && parent && (
          <Pressable
            onPress={goBack}
            className="flex-row items-center px-4 py-2 border-b border-border"
          >
            <ChevronLeft size={20} color="#3B82F6" />
            <Text className="text-primary ml-1" numberOfLines={1}>
              {parent.title}
            </Text>
          </Pressable>
        )}

        {/* Task header */}
        <View className="flex-row items-start px-4 py-4">
          <Pressable onPress={() => handleToggle(task.id)} className="mr-3 mt-1">
            <Checkbox
              checked={isCompleted}
              onCheckedChange={() => handleToggle(task.id)}
            />
          </Pressable>
          <View className="flex-1">
            <Text
              className={`text-xl font-semibold ${isCompleted ? 'line-through text-muted-foreground' : ''}`}
            >
              {task.title}
            </Text>
            {(editingDescription ?? task.description) && (
              <Text className="text-muted-foreground mt-1">
                {editingDescription ?? task.description}
              </Text>
            )}
          </View>
        </View>

        <Separator />

        {/* Subtasks */}
        {subtasks.map((subtask) => (
          <SubtaskItem
            key={subtask.id}
            task={subtask}
            onPress={() => drillDown(subtask)}
            onToggle={() => handleToggle(subtask.id)}
            subtaskProgress={getSubtaskProgress(tasks, subtask.id)}
          />
        ))}

        {/* Add subtask input */}
        <View className="flex-row items-center px-4 border-b border-border" style={{ minHeight: 48 }}>
          <View className="w-5 mr-3 items-center">
            <Plus size={20} color="#9CA3AF" />
          </View>
          <TextInput
            className="flex-1 text-base text-foreground"
            style={{ height: 48, padding: 0, margin: 0 }}
            placeholder="Add subtask"
            placeholderTextColor="#9CA3AF"
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
          />
        </View>

        {/* Task options */}
        <TaskOptions
          task={task}
          project={project}
          projects={projects}
          onUpdate={handleUpdateField}
          onDescriptionChange={setEditingDescription}
        />

        {/* API URL debug info */}
        <View className="px-4 py-3 mt-4">
          <Text className="text-xs text-muted-foreground/50 text-center">
            API: {Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000'}
          </Text>
        </View>
      </BottomSheetScrollView>
    </BottomSheet>
  );
}
