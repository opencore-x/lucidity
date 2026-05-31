// Swipeable / draggable task-row pieces shared by the project detail and Inbox
// screens (the project list landing is now a native @expo/ui List). The old
// accordion ProjectGroup that also lived here is gone.
import * as React from 'react';
import { View, Text as RNText, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Trash2, CalendarCheck, Check } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { getSubtaskProgress } from '@/utils/helpers';
import { FONTS } from '@/lib/fonts';
import type { Task } from '@lucidity/shared';

const ITEM_HEIGHT = 56;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface DraggableTaskProps {
  task: Task;
  index: number;
  tasksCount: number;
  allTasks: Task[];
  isLast: boolean;
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDragStart: () => void;
  onDragUpdate: (targetIndex: number) => void;
  onDragEnd: () => void;
  onDeleteTask: (taskId: string) => void;
  onSetDueToday: (taskId: string) => void;
}

export function LeftAction({ confirmed }: { confirmed: boolean }) {
  return (
    <View
      style={{ backgroundColor: '#F59E0B', width: SCREEN_WIDTH }}
      className="h-full flex-row items-center gap-1.5 pl-4">
      {confirmed ? (
        <>
          <Check size={18} color="#FFFFFF" />
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
              fontFamily: FONTS.semibold,
            }}>
            Added to Today
          </RNText>
        </>
      ) : (
        <>
          <CalendarCheck size={18} color="#FFFFFF" />
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
              fontFamily: FONTS.semibold,
            }}>
            Today
          </RNText>
        </>
      )}
    </View>
  );
}

export function DeleteRightAction({ confirmed }: { confirmed: boolean }) {
  return (
    <View
      style={{ backgroundColor: '#EF4444', width: SCREEN_WIDTH }}
      className="h-full flex-row items-center justify-end gap-1.5 pr-4">
      {confirmed ? (
        <>
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
              fontFamily: FONTS.semibold,
            }}>
            Deleted
          </RNText>
          <Check size={18} color="#FFFFFF" />
        </>
      ) : (
        <>
          <RNText
            style={{
              color: '#FFFFFF',
              fontSize: 13,
              fontWeight: '600',
              fontFamily: FONTS.semibold,
            }}>
            Delete
          </RNText>
          <Trash2 size={18} color="#FFFFFF" />
        </>
      )}
    </View>
  );
}

export function DraggableTask({
  task,
  index,
  tasksCount,
  allTasks,
  isLast,
  onTaskPress,
  onTaskToggle,
  onReorder,
  onDragStart,
  onDragUpdate,
  onDragEnd,
  onDeleteTask,
  onSetDueToday,
}: DraggableTaskProps) {
  const swipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const translateY = useSharedValue(0);
  const isActive = useSharedValue(false);

  const [leftConfirmed, setLeftConfirmed] = React.useState(false);
  const [rightConfirmed, setRightConfirmed] = React.useState(false);

  const renderRightActions = React.useCallback(
    () => <DeleteRightAction confirmed={rightConfirmed} />,
    [rightConfirmed]
  );

  const renderLeftActions = React.useCallback(
    () => <LeftAction confirmed={leftConfirmed} />,
    [leftConfirmed]
  );

  const handleSwipeOpen = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'right') {
        onSetDueToday(task.id);
        setLeftConfirmed(true);
        setTimeout(() => {
          swipeableRef.current?.close();
          setLeftConfirmed(false);
        }, 1200);
      } else if (direction === 'left') {
        onDeleteTask(task.id);
        setRightConfirmed(true);
        setTimeout(() => {
          swipeableRef.current?.close();
          setRightConfirmed(false);
        }, 1200);
      }
    },
    [task.id, onSetDueToday, onDeleteTask]
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
    transform: [{ translateY: translateY.value }, { scale: withSpring(isActive.value ? 1.03 : 1) }],
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
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      friction={1}
      rightThreshold={SCREEN_WIDTH * 0.4}
      leftThreshold={SCREEN_WIDTH * 0.4}>
      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <TaskItem
            task={task}
            onPress={() => onTaskPress(task)}
            onToggle={() => onTaskToggle(task.id)}
            subtaskProgress={getSubtaskProgress(allTasks, task.id)}
            isLast={isLast}
          />
        </Animated.View>
      </GestureDetector>
    </ReanimatedSwipeable>
  );
}

export function SwipeableCompletedTask({
  task,
  allTasks,
  isLast,
  onTaskPress,
  onTaskToggle,
  onDeleteTask,
}: {
  task: Task;
  allTasks: Task[];
  isLast: boolean;
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const swipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const [confirmed, setConfirmed] = React.useState(false);

  const renderRightActions = React.useCallback(
    () => <DeleteRightAction confirmed={confirmed} />,
    [confirmed]
  );

  const handleSwipeOpen = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        onDeleteTask(task.id);
        setConfirmed(true);
        setTimeout(() => {
          swipeableRef.current?.close();
          setConfirmed(false);
        }, 1200);
      }
    },
    [task.id, onDeleteTask]
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      friction={1}
      rightThreshold={SCREEN_WIDTH * 0.4}>
      <TaskItem
        task={task}
        subtaskProgress={getSubtaskProgress(allTasks, task.id)}
        onPress={() => onTaskPress(task)}
        onToggle={() => onTaskToggle(task.id)}
        isLast={isLast}
      />
    </ReanimatedSwipeable>
  );
}

export function DropIndicator({ visible }: { visible: boolean }) {
  const opacity = useSharedValue(0);
  const height = useSharedValue(0);

  React.useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 150 });
    height.value = withTiming(visible ? 2 : 0, { duration: 150 });
  }, [visible, opacity, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    height: height.value,
  }));

  return <Animated.View style={animatedStyle} className="bg-primary mx-4 rounded-full" />;
}
