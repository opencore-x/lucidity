import * as React from 'react';
import { View, Pressable, Keyboard } from 'react-native';
import {
  BottomSheetModal,
  BottomSheetView,
  BottomSheetScrollView,
  BottomSheetBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';
import { useColorScheme } from 'nativewind';
import { Text } from '@/components/ui/text';
import { MarkdownText } from '@/components/ui/markdown';
import { Separator } from '@/components/ui/separator';
import { SubtaskList } from './SubtaskList';
import { TaskOptions } from './TaskOptions';
import { CommentSection } from './CommentSection';
import { StatusPill } from './StatusPill';
import { ChevronLeft, Plus, RefreshCw, X } from '@/lib/icons';
import { useSheetStore } from '@/stores/sheetStore';
import { getSubtasks } from '@/utils/helpers';
import { useToggleTask, useCreateTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { THEME } from '@/lib/theme';
import Constants from 'expo-constants';
import type { Task, Project, UpdateTask } from '@lucidity/shared';

interface TaskSheetProps {
  tasks: Task[];
  projects: Project[];
}

export function TaskSheet({ tasks, projects }: TaskSheetProps) {
  const [newSubtaskTitle, setNewSubtaskTitle] = React.useState('');
  const [isEditingTitle, setIsEditingTitle] = React.useState(false);
  const [isEditingDescription, setIsEditingDescription] = React.useState(false);
  const [titleValue, setTitleValue] = React.useState('');
  const [descriptionValue, setDescriptionValue] = React.useState('');
  const { colorScheme } = useColorScheme();
  const theme = THEME[colorScheme === 'dark' ? 'dark' : 'light'];


  const {
    currentTask,
    canGoBack,
    sheetRef,
    resetState,
    drillDown,
    goBack,
    updateCurrentTask,
  } = useSheetStore();

  const task = currentTask();

  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();

  const snapPoints = React.useMemo(() => ['50%', '90%'], []);

  // Sync title/description values when task changes
  React.useEffect(() => {
    if (task) {
      setTitleValue(task.title);
      setDescriptionValue(task.description || '');
    }
  }, [task?.id, task?.title, task?.description]);


  const handleDismiss = React.useCallback(() => {
    resetState();
    setIsEditingTitle(false);
    setIsEditingDescription(false);
    setNewSubtaskTitle('');
  }, [resetState]);

  const handleToggle = React.useCallback(
    (taskId: string) => {
      toggleTask.mutate(taskId);
    },
    [toggleTask]
  );

  const handleDeleteSubtask = React.useCallback(
    (taskId: string) => {
      deleteTask(taskId);
    },
    [deleteTask]
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

  const handleUpdateField = React.useCallback(
    (data: Partial<UpdateTask>) => {
      if (!task) return;
      updateTask.mutate(
        { id: task.id, data },
        {
          onSuccess: (updatedTask) => {
            updateCurrentTask(updatedTask);
          },
        }
      );
    },
    [task, updateTask, updateCurrentTask]
  );

  const handleTitleSubmit = React.useCallback(() => {
    if (!task) return;
    if (titleValue.trim() && titleValue !== task.title) {
      handleUpdateField({ title: titleValue.trim() });
    } else {
      setTitleValue(task.title);
    }
    setIsEditingTitle(false);
    Keyboard.dismiss();
  }, [task, titleValue, handleUpdateField]);

  const handleDescriptionSubmit = React.useCallback(() => {
    if (!task) return;
    const trimmed = descriptionValue.trim();
    const newDescription = trimmed || null;
    const currentDescription = task.description || null;
    if (newDescription !== currentDescription) {
      handleUpdateField({ description: newDescription });
    }
    setIsEditingDescription(false);
    Keyboard.dismiss();
  }, [task, descriptionValue, handleUpdateField]);

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

  const project = task ? projects.find((p) => p.id === task.projectId) : undefined;

  const renderContent = () => {
    if (!task) {
      return <BottomSheetView>{null}</BottomSheetView>;
    }

    const subtasks = getSubtasks(tasks, task.id);
    const isCompleted = task.status === 'completed';

    return (
      <>
        {/* Fixed top bar: back + status pill + close button */}
        <View className="flex-row items-center justify-between px-4 pt-2">
          {canGoBack() ? (
            <Pressable
              onPress={goBack}
              style={{
                padding: 8,
                borderRadius: 50,
                backgroundColor: theme.card,
                borderWidth: 1,
                borderColor: theme.border,
              }}
              hitSlop={8}
            >
              <ChevronLeft size={18} color="#9CA3AF" />
            </Pressable>
          ) : (
            <View style={{ width: 34 }} />
          )}
          <StatusPill
            status={task.status}
            onStatusChange={(status) => handleUpdateField({ status })}
          />
          <Pressable
            onPress={() => sheetRef.current?.dismiss()}
            style={{
              padding: 8,
              borderRadius: 50,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
            }}
            hitSlop={8}
          >
            <X size={18} color="#9CA3AF" />
          </Pressable>
        </View>

        <BottomSheetScrollView className="flex-1">
        {/* Task header */}
        <View className="px-4 py-4">
          <View>
            {/* Title row with recurring indicator */}
            <View className="flex-row items-center justify-between">
              <View className="flex-1 mr-2">
                {isEditingTitle ? (
                  <BottomSheetTextInput
                    className="text-xl font-semibold text-foreground"
                    style={{ padding: 0, margin: 0, minHeight: 28 }}
                    value={titleValue}
                    onChangeText={setTitleValue}
                    onBlur={handleTitleSubmit}
                    onSubmitEditing={handleTitleSubmit}
                    autoFocus
                    returnKeyType="done"
                    blurOnSubmit
                  />
                ) : (
                  <Pressable onPress={() => setIsEditingTitle(true)}>
                    <Text
                      className={`text-xl font-semibold ${isCompleted ? 'text-muted-foreground' : ''}`}
                    >
                      {task.title}
                      {task.taskNumber != null && (
                        <Text className="text-sm text-muted-foreground font-normal"> #{task.taskNumber}</Text>
                      )}
                    </Text>
                  </Pressable>
                )}
              </View>
              {/* Recurring indicator */}
              {task.recurringFrequency && (
                <RefreshCw size={18} color="#9CA3AF" />
              )}
            </View>

            {/* Description section - always visible */}
            <View className="mt-2">
              {isEditingDescription ? (
                <BottomSheetTextInput
                  className="text-muted-foreground font-sans"
                  style={{ padding: 0, margin: 0, minHeight: 20 }}
                  value={descriptionValue}
                  onChangeText={setDescriptionValue}
                  onBlur={handleDescriptionSubmit}
                  onSubmitEditing={handleDescriptionSubmit}
                  autoFocus
                  returnKeyType="done"
                  blurOnSubmit
                  placeholder="Add description..."
                  placeholderTextColor="#9CA3AF"
                  multiline
                />
              ) : task.description ? (
                <Pressable onPress={() => setIsEditingDescription(true)}>
                  <MarkdownText muted>{task.description}</MarkdownText>
                </Pressable>
              ) : (
                <Pressable onPress={() => setIsEditingDescription(true)}>
                  <Text className="text-muted-foreground">Add description...</Text>
                </Pressable>
              )}
            </View>
          </View>
        </View>

        <Separator />

        {/* Subtasks with drag-to-reorder */}
        <SubtaskList
          subtasks={subtasks}
          allTasks={tasks}
          onSubtaskPress={drillDown}
          onSubtaskToggle={handleToggle}
          onDeleteSubtask={handleDeleteSubtask}
        />

        {/* Add subtask input */}
        <View className="flex-row items-center px-4 border-b border-border" style={{ minHeight: 48 }}>
          <View className="w-5 mr-3 items-center">
            <Plus size={20} color="#9CA3AF" />
          </View>
          <BottomSheetTextInput
            className="flex-1 text-base text-foreground font-sans"
            style={{ height: 48, padding: 0, margin: 0 }}
            placeholder="Add subtask"
            placeholderTextColor="#9CA3AF"
            value={newSubtaskTitle}
            onChangeText={setNewSubtaskTitle}
            onSubmitEditing={handleAddSubtask}
            returnKeyType="done"
          />
        </View>

        {/* Comments */}
        <CommentSection taskId={task.id} />

        {/* Task options */}
        <TaskOptions
          task={task}
          tasks={tasks}
          project={project}
          projects={projects}
          onUpdate={handleUpdateField}
        />

        {/* API URL debug info */}
        <View className="px-4 py-3 mt-4">
          <Text className="text-xs text-muted-foreground/50 text-center">
            API: {Constants.expoConfig?.extra?.apiUrl || 'http://localhost:3000'}
          </Text>
        </View>
      </BottomSheetScrollView>
      </>
    );
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enableDynamicSizing={false}
      onDismiss={handleDismiss}
      enableDismissOnClose
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: theme.card }}
      handleIndicatorStyle={{ backgroundColor: theme.border }}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
    >
      {renderContent()}
    </BottomSheetModal>
  );
}
