import * as React from 'react';
import { View, Pressable, TextInput, Keyboard, Text as RNText, Dimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, ChevronDown, ChevronRight, Pencil, CalendarCheck, Check } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { InlineTaskInput } from './InlineTaskInput';
import { getSubtaskProgress, isInboxProject, formatRelativeTime } from '@/utils/helpers';
import { useRouter } from 'expo-router';
import { useUpdateProject } from '@/hooks/useProjects';
import { useProjectSheetStore } from '@/stores/projectSheetStore';
import { FONTS } from '@/lib/fonts';
import type { Task, Project } from '@lucidity/shared';

const ITEM_HEIGHT = 56;
const SCREEN_WIDTH = Dimensions.get('window').width;

interface ProjectGroupProps {
  project: Project;
  tasks: Task[];
  allTasks: Task[];
  expandAll?: boolean | null;
  triggerAddTask?: boolean;
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onReorderTasks: (taskIds: string[]) => void;
  onDeleteTask: (taskId: string) => void;
  onSetDueToday: (taskId: string) => void;
}

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
      className="flex-row items-center pl-4 gap-1.5 h-full"
    >
      {confirmed ? (
        <>
          <Check size={18} color="#FFFFFF" />
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Added to Today
          </RNText>
        </>
      ) : (
        <>
          <CalendarCheck size={18} color="#FFFFFF" />
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
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
      className="flex-row items-center justify-end pr-4 gap-1.5 h-full"
    >
      {confirmed ? (
        <>
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Deleted
          </RNText>
          <Check size={18} color="#FFFFFF" />
        </>
      ) : (
        <>
          <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
            Delete
          </RNText>
          <Trash2 size={18} color="#FFFFFF" />
        </>
      )}
    </View>
  );
}

function EditRightAction() {
  return (
    <View
      style={{ backgroundColor: '#3B82F6', width: SCREEN_WIDTH }}
      className="flex-row items-center justify-end pr-4 gap-1.5 h-full"
    >
      <RNText style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '600', fontFamily: FONTS.semibold }}>
        Edit
      </RNText>
      <Pencil size={18} color="#FFFFFF" />
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
      renderLeftActions={renderLeftActions}
      onSwipeableOpen={handleSwipeOpen}
      overshootRight={false}
      friction={1}
      rightThreshold={SCREEN_WIDTH * 0.4}
      leftThreshold={SCREEN_WIDTH * 0.4}
    >
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
      rightThreshold={SCREEN_WIDTH * 0.4}
    >
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

  return (
    <Animated.View
      style={animatedStyle}
      className="bg-primary mx-4 rounded-full"
    />
  );
}

export function ProjectGroup({
  project,
  tasks,
  allTasks,
  onTaskPress,
  onTaskToggle,
  onReorderTasks,
  onDeleteTask,
  onSetDueToday,
  expandAll,
  triggerAddTask,
}: ProjectGroupProps) {
  const activeTasks = React.useMemo(
    () => tasks.filter((t) => t.status !== 'completed'),
    [tasks]
  );
  const completedTasks = React.useMemo(
    () =>
      tasks
        .filter((t) => t.status === 'completed')
        .sort((a, b) => {
          const aTime = new Date(a.completedAt ?? 0).getTime();
          const bTime = new Date(b.completedAt ?? 0).getTime();
          return bTime - aTime;
        }),
    [tasks]
  );

  const [localTasks, setLocalTasks] = React.useState(activeTasks);
  const [isDragging, setIsDragging] = React.useState(false);
  const [dropIndex, setDropIndex] = React.useState<number | null>(null);
  const [dragFromIndex, setDragFromIndex] = React.useState<number | null>(null);
  const [isAddingTask, setIsAddingTask] = React.useState(false);

  const [isEditingName, setIsEditingName] = React.useState(false);
  const [nameValue, setNameValue] = React.useState(project.name);
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [completedExpanded, setCompletedExpanded] = React.useState(true);
  const [showAllCompleted, setShowAllCompleted] = React.useState(false);
  const INITIAL_COMPLETED_COUNT = 2;
  const visibleCompleted = showAllCompleted
    ? completedTasks
    : completedTasks.slice(0, INITIAL_COMPLETED_COUNT);
  const hiddenCount = completedTasks.length - INITIAL_COMPLETED_COUNT;

  const router = useRouter();
  const updateProject = useUpdateProject();
  const headerSwipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const chevronRotation = useSharedValue(-90);

  // Check if this is the virtual Inbox (not a real project)
  const isInbox = isInboxProject(project);

  // Calculate completed vs total tasks
  const completedCount = completedTasks.length;
  const totalCount = tasks.length;
  const completionPercentage = totalCount > 0 ? completedCount / totalCount : 0;

  React.useEffect(() => {
    if (expandAll !== null && expandAll !== undefined) {
      setIsExpanded(expandAll);
    }
  }, [expandAll]);

  React.useEffect(() => {
    if (triggerAddTask) {
      setIsExpanded(true);
      setIsAddingTask(true);
    }
  }, [triggerAddTask]);

  React.useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 0 : -90, { duration: 200 });
  }, [isExpanded, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  React.useEffect(() => {
    setLocalTasks(activeTasks);
  }, [activeTasks]);

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

  const handleHeaderSwipeOpen = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        headerSwipeableRef.current?.close();
        useProjectSheetStore.getState().openSheet(project);
      }
    },
    [project]
  );

  const renderHeaderRightActions = React.useCallback(
    () => <EditRightAction />,
    []
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

  // Header content (shared between Inbox and regular projects)
  const headerContent = (
    <View className="flex-row items-center justify-between pl-2 pr-4 py-1 bg-background">
      <Pressable
        onPress={() => setIsExpanded(!isExpanded)}
        className="pr-3"
        hitSlop={8}
      >
        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={!isInbox && project.color ? project.color : '#6B7280'} />
        </Animated.View>
      </Pressable>
      <View className="flex-row items-center flex-1">
        {isEditingName && !isInbox ? (
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
            className="flex-1"
            onPress={() => {
              if (isInbox) {
                setIsExpanded(!isExpanded);
              } else {
                router.push(`/project/${project.id}`);
              }
            }}
          >
            <Text className="text-lg font-bold" style={!isInbox && project.color ? { color: project.color } : undefined}>{project.name}</Text>
          </Pressable>
        )}
      </View>
      <View className="flex-row items-center gap-1.5 mr-3">
        <Text className="text-sm text-muted-foreground opacity-60">
          {completedCount}/{totalCount}
        </Text>
        <View className="w-4 h-4 rounded-full border-2 border-muted-foreground/30 items-center justify-center">
          <View
            className="rounded-full bg-primary"
            style={{
              width: 12 * completionPercentage,
              height: 12 * completionPercentage,
            }}
          />
        </View>
      </View>
      <Button
        variant="ghost"
        size="icon"
        onPress={() => {
          if (!isExpanded) setIsExpanded(true);
          setIsAddingTask(true);
        }}
      >
        <Plus size={20} color="#3B82F6" />
      </Button>
    </View>
  );

  return (
    <View>
      {/* Header - Inbox has no swipe actions, regular projects do */}
      {isInbox ? (
        headerContent
      ) : (
        <ReanimatedSwipeable
          ref={headerSwipeableRef}
          renderRightActions={renderHeaderRightActions}
          onSwipeableOpen={handleHeaderSwipeOpen}
          overshootRight={false}
          friction={1}
          rightThreshold={SCREEN_WIDTH * 0.4}
        >
          {headerContent}
        </ReanimatedSwipeable>
      )}

      {/* Tasks with drop indicators */}
      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
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
                          onTaskPress={onTaskPress}
                          onTaskToggle={onTaskToggle}
                          onDeleteTask={onDeleteTask}
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
                isLast={index === localTasks.length - 1}
                onTaskPress={onTaskPress}
                onTaskToggle={onTaskToggle}
                onReorder={handleReorder}
                onDragStart={() => handleDragStart(index)}
                onDragUpdate={handleDragUpdate}
                onDragEnd={handleDragEnd}
                onDeleteTask={onDeleteTask}
                onSetDueToday={onSetDueToday}
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

          {/* Inline task input or "+ New task" row */}
          {isAddingTask ? (
            <InlineTaskInput
              projectId={isInbox ? null : project.id}
              onComplete={() => setIsAddingTask(false)}
              autoFocus
            />
          ) : (
            <Pressable
              onPress={() => setIsAddingTask(true)}
              className="flex-row items-center px-4 py-3"
            >
              <Plus size={18} color="#9CA3AF" />
              <Text className="ml-2 text-base text-muted-foreground">New task</Text>
            </Pressable>
          )}
        </Animated.View>
      )}

      {/* Separator between projects */}
      <Separator />
    </View>
  );
}
