import * as React from 'react';
import { View, Pressable, Alert, TextInput, Keyboard } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, ChevronDown, Pencil } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { getSubtaskProgress } from '@/utils/helpers';
import { useUpdateProject } from '@/hooks/useProjects';
import type { Task, Project } from '@lucidity/shared';

const ITEM_HEIGHT = 56;

interface ProjectGroupProps {
  project: Project;
  tasks: Task[];
  allTasks: Task[];
  onAddTask: (projectId: string) => void;
  onDeleteProject: (projectId: string) => void;
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onReorderTasks: (taskIds: string[]) => void;
  onDeleteTask: (taskId: string) => void;
}

interface DraggableTaskProps {
  task: Task;
  index: number;
  tasksCount: number;
  allTasks: Task[];
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragUpdate: (targetIndex: number) => void;
  onDragEnd: () => void;
  onDeleteTask: (taskId: string) => void;
}

function RightAction({
  drag,
  onDelete,
}: {
  drag: SharedValue<number>;
  onDelete: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onDelete}
        className="bg-destructive justify-center items-center w-20 h-full"
      >
        <Trash2 size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

function HeaderRightActions({
  drag,
  onEdit,
  onDelete,
}: {
  drag: SharedValue<number>;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 160 }],
  }));

  return (
    <Animated.View style={animatedStyle} className="flex-row">
      <Pressable
        onPress={onEdit}
        className="bg-blue-500 justify-center items-center w-20 h-full"
      >
        <Pencil size={24} color="#FFFFFF" />
      </Pressable>
      <Pressable
        onPress={onDelete}
        className="bg-destructive justify-center items-center w-20 h-full"
      >
        <Trash2 size={24} color="#FFFFFF" />
      </Pressable>
    </Animated.View>
  );
}

function DraggableTask({
  task,
  index,
  tasksCount,
  allTasks,
  onTaskPress,
  onTaskToggle,
  onReorder,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDeleteTask,
}: DraggableTaskProps) {
  const swipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const handleDelete = React.useCallback(() => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => swipeableRef.current?.close(),
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => onDeleteTask(task.id),
        },
      ]
    );
  }, [task.id, task.title, onDeleteTask]);

  const renderRightActions = React.useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => {
      return <RightAction drag={drag} onDelete={handleDelete} />;
    },
    [handleDelete]
  );

  const gesture = Gesture.Pan()
    .activateAfterLongPress(200)
    .onStart(() => {
      isActive.value = true;
      runOnJS(onDragStart)();
    })
    .onUpdate((e) => {
      translateY.value = e.translationY;
      const newIndex = Math.round(e.translationY / ITEM_HEIGHT) + index;
      const clampedIndex = Math.max(0, Math.min(tasksCount - 1, newIndex));
      runOnJS(onDragUpdate)(clampedIndex);
    })
    .onEnd(() => {
      const newIndex = Math.round(translateY.value / ITEM_HEIGHT) + index;
      const clampedIndex = Math.max(0, Math.min(tasksCount - 1, newIndex));

      if (clampedIndex !== index) {
        runOnJS(onReorder)(index, clampedIndex);
      }

      translateY.value = withSpring(0);
      isActive.value = false;
      runOnJS(onDragEnd)();
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: withSpring(isActive.value ? 1.03 : 1) },
    ],
    zIndex: isActive.value ? 100 : 0,
    opacity: isActive.value ? 0.9 : 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: isActive.value ? 4 : 0 },
    shadowOpacity: withSpring(isActive.value ? 0.15 : 0),
    shadowRadius: isActive.value ? 8 : 0,
  }));

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
    >
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <TaskItem
            task={task}
            onPress={() => onTaskPress(task)}
            onToggle={() => onTaskToggle(task.id)}
            subtaskProgress={getSubtaskProgress(allTasks, task.id)}
          />
        </Animated.View>
      </GestureDetector>
    </ReanimatedSwipeable>
  );
}

function DropIndicator({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 150 });
  }, [visible, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={animatedStyle}
      className="h-0.5 bg-primary mx-4 rounded-full"
    />
  );
}

export function ProjectGroup({
  project,
  tasks,
  allTasks,
  onAddTask,
  onDeleteProject,
  onTaskPress,
  onTaskToggle,
  onReorderTasks,
  onDeleteTask,
}: ProjectGroupProps) {
  const [localTasks, setLocalTasks] = React.useState(tasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(project.name);
  const [isExpanded, setIsExpanded] = React.useState(true);
  const updateProject = useUpdateProject();
  const headerSwipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const chevronRotation = useSharedValue(0);

  React.useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 0 : -90, { duration: 200 });
  }, [isExpanded, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  React.useEffect(() => {
    setNameValue(project.name);
  }, [project.name]);

  const handleNameSubmit = React.useCallback(() => {
    if (nameValue.trim() && nameValue !== project.name) {
      updateProject.mutate({ id: project.id, data: { name: nameValue.trim() } });
    } else {
      setNameValue(project.name);
    }
    setIsEditingName(false);
    Keyboard.dismiss();
  }, [project.id, project.name, nameValue, updateProject]);

  const handleDeleteProject = React.useCallback(() => {
    Alert.alert(
      'Delete Project',
      `Delete "${project.name}" and all its tasks?`,
      [
        { text: 'Cancel', style: 'cancel', onPress: () => headerSwipeableRef.current?.close() },
        { text: 'Delete', style: 'destructive', onPress: () => onDeleteProject(project.id) },
      ]
    );
  }, [project.id, project.name, onDeleteProject]);

  const handleEditProject = React.useCallback(() => {
    headerSwipeableRef.current?.close();
    setIsEditingName(true);
  }, []);

  const renderHeaderRightActions = React.useCallback(
    (_prog: SharedValue<number>, drag: SharedValue<number>) => (
      <HeaderRightActions drag={drag} onEdit={handleEditProject} onDelete={handleDeleteProject} />
    ),
    [handleEditProject, handleDeleteProject]
  );

  const handleReorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      const newTasks = [...localTasks];
      const [moved] = newTasks.splice(fromIndex, 1);
      newTasks.splice(toIndex, 0, moved);
      setLocalTasks(newTasks);
      onReorderTasks(newTasks.map((t) => t.id));
    },
    [localTasks, onReorderTasks]
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

  return (
    <View className="mb-4">
      {/* Header with swipe-to-delete */}
      <ReanimatedSwipeable
        ref={headerSwipeableRef}
        renderRightActions={renderHeaderRightActions}
        overshootRight={false}
        friction={2}
        rightThreshold={40}
      >
        <View className="flex-row items-center justify-between px-4 bg-background">
          <Pressable
            onPress={() => setIsExpanded(!isExpanded)}
            className="py-2 pr-2"
            hitSlop={8}
          >
            <Animated.View style={chevronStyle}>
              <ChevronDown size={20} color="#6B7280" />
            </Animated.View>
          </Pressable>
          <View className="flex-row items-center flex-1">
            {isEditingName ? (
              <TextInput
                className="text-lg font-semibold text-foreground flex-1"
                style={{ padding: 0, margin: 0, minHeight: 24 }}
                value={nameValue}
                onChangeText={setNameValue}
                onBlur={handleNameSubmit}
                onSubmitEditing={handleNameSubmit}
                autoFocus
                returnKeyType="done"
                blurOnSubmit
              />
            ) : (
              <Pressable
                className="flex-row items-center flex-1"
                onPress={() => setIsExpanded(!isExpanded)}
              >
                <Text className="text-lg font-semibold">{project.name}</Text>
                <Text className="ml-2 text-sm text-muted-foreground">{tasks.length}</Text>
              </Pressable>
            )}
          </View>
          <Button variant="ghost" size="icon" onPress={() => onAddTask(project.id)}>
            <Plus size={20} color="#3B82F6" />
          </Button>
        </View>
      </ReanimatedSwipeable>

      {/* Tasks with drop indicators */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          {localTasks.map((task, index) => (
            <React.Fragment key={task.id}>
              {/* Drop indicator above this item */}
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
                onTaskPress={onTaskPress}
                onTaskToggle={onTaskToggle}
                onReorder={handleReorder}
                onDragStart={() => handleDragStart(index)}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
                onDeleteTask={onDeleteTask}
              />
              {/* Drop indicator below this item */}
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
          {/* Drop indicator at the very end */}
          <DropIndicator
            visible={
              isDragging &&
              dropIndex === localTasks.length - 1 &&
              dragFromIndex !== null &&
              dragFromIndex < localTasks.length - 1
            }
          />
        </Animated.View>
      )}
    </View>
  );
}
