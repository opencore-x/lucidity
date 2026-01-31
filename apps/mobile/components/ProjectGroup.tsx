import * as React from 'react';
import { View, Pressable, Alert } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { getSubtaskProgress } from '@/utils/helpers';
import type { Task, Project } from '@lucidity/shared';

const ITEM_HEIGHT = 56;

interface ProjectGroupProps {
  project: Project;
  tasks: Task[];
  allTasks: Task[];
  onAddTask: (projectId: string) => void;
  onProjectPress: (project: Project) => void;
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
  onProjectPress,
  onTaskPress,
  onTaskToggle,
  onReorderTasks,
  onDeleteTask,
}: ProjectGroupProps) {
  const [localTasks, setLocalTasks] = React.useState(tasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

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
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-2 bg-background">
        <Pressable
          className="flex-row items-center flex-1"
          onPress={() => onProjectPress(project)}
        >
          <Text className="text-lg font-semibold">{project.name}</Text>
          <Text className="ml-2 text-sm text-muted-foreground">
            {tasks.length}
          </Text>
        </Pressable>
        <Button
          variant="ghost"
          size="icon"
          onPress={() => onAddTask(project.id)}
        >
          <Plus size={20} color="#3B82F6" />
        </Button>
      </View>

      {/* Tasks with drop indicators */}
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
    </View>
  );
}
