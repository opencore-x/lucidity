import * as React from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { SubtaskItem } from './SubtaskItem';
import { getSubtaskProgress } from '@/utils/helpers';
import { useReorderTasks } from '@/hooks/useTasks';
import type { Task } from '@lucidity/shared';

const ITEM_HEIGHT = 52;

interface SubtaskListProps {
  subtasks: Task[];
  allTasks: Task[];
  onSubtaskPress: (task: Task) => void;
  onSubtaskToggle: (taskId: string) => void;
}

interface DraggableSubtaskProps {
  task: Task;
  index: number;
  tasksCount: number;
  allTasks: Task[];
  onPress: () => void;
  onToggle: () => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragUpdate: (targetIndex: number) => void;
  onDragEnd: () => void;
}

function DraggableSubtask({
  task,
  index,
  tasksCount,
  allTasks,
  onPress,
  onToggle,
  onReorder,
  onDragStart,
  onDragUpdate,
  onDragEnd,
}: DraggableSubtaskProps) {
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

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
    <GestureDetector gesture={gesture}>
      <Animated.View style={animatedStyle}>
        <SubtaskItem
          task={task}
          onPress={onPress}
          onToggle={onToggle}
          subtaskProgress={getSubtaskProgress(allTasks, task.id)}
        />
      </Animated.View>
    </GestureDetector>
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

export function SubtaskList({
  subtasks,
  allTasks,
  onSubtaskPress,
  onSubtaskToggle,
}: SubtaskListProps) {
  const [localSubtasks, setLocalSubtasks] = React.useState(subtasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);

  const reorderTasks = useReorderTasks();

  React.useEffect(() => {
    setLocalSubtasks(subtasks);
  }, [subtasks]);

  const handleReorder = React.useCallback(
    (fromIndex: number, toIndex: number) => {
      const newSubtasks = [...localSubtasks];
      const [moved] = newSubtasks.splice(fromIndex, 1);
      newSubtasks.splice(toIndex, 0, moved);
      setLocalSubtasks(newSubtasks);
      reorderTasks.mutate(newSubtasks.map((t) => t.id));
    },
    [localSubtasks, reorderTasks]
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

  if (localSubtasks.length === 0) {
    return null;
  }

  return (
    <View>
      {localSubtasks.map((subtask, index) => (
        <React.Fragment key={subtask.id}>
          {/* Drop indicator above this item */}
          <DropIndicator
            visible={
              isDragging &&
              dropIndex === index &&
              dragFromIndex !== null &&
              dragFromIndex > index
            }
          />
          <DraggableSubtask
            task={subtask}
            index={index}
            tasksCount={localSubtasks.length}
            allTasks={allTasks}
            onPress={() => onSubtaskPress(subtask)}
            onToggle={() => onSubtaskToggle(subtask.id)}
            onReorder={handleReorder}
            onDragStart={() => handleDragStart(index)}
            onDragUpdate={handleDragUpdate}
            onDragEnd={handleDragEnd}
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
          dropIndex === localSubtasks.length - 1 &&
          dragFromIndex !== null &&
          dragFromIndex < localSubtasks.length - 1
        }
      />
    </View>
  );
}
