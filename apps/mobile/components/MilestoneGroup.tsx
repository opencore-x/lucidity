import * as React from 'react';
import { View, Pressable, Dimensions, Text as RNText } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Text } from '@/components/ui/text';
import { Separator } from '@/components/ui/separator';
import { InlineTaskInput } from '@/components/InlineTaskInput';
import { ChevronDown, Plus, Trash2, Check } from '@/lib/icons';
import { TaskItem } from './TaskItem';
import { getSubtaskProgress, formatRelativeTime } from '@/utils/helpers';
import { useMilestoneProgress } from '@/hooks/useMilestones';
import { FONTS } from '@/lib/fonts';
import type { Task, Milestone, Project } from '@lucidity/shared';

const SCREEN_WIDTH = Dimensions.get('window').width;

function DeleteRightAction({ confirmed }: { confirmed: boolean }) {
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

function SwipeableMilestoneTask({
  task,
  tasks,
  isLast,
  onPress,
  onToggle,
  onDeleteTask,
}: {
  task: Task;
  tasks: Task[];
  isLast: boolean;
  onPress: () => void;
  onToggle: () => void;
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
        subtaskProgress={getSubtaskProgress(tasks, task.id)}
        onPress={onPress}
        onToggle={onToggle}
        isLast={isLast}
      />
    </ReanimatedSwipeable>
  );
}

function ProgressBar({ percent }: { percent: number }) {
  return (
    <View className="h-1.5 bg-muted rounded-full overflow-hidden flex-1">
      <View
        className="h-full rounded-full"
        style={{
          width: `${percent}%`,
          backgroundColor: percent === 100 ? '#22C55E' : '#3B82F6',
        }}
      />
    </View>
  );
}

interface MilestoneGroupProps {
  milestone: Milestone;
  project: Project | undefined;
  tasks: Task[];
  allTasks: Task[];
  onTaskPress: (task: Task) => void;
  onTaskToggle: (taskId: string) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteMilestone: (milestoneId: string) => void;
}

export function MilestoneGroup({
  milestone,
  project,
  tasks,
  allTasks,
  onTaskPress,
  onTaskToggle,
  onDeleteTask,
  onDeleteMilestone,
}: MilestoneGroupProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [isAddingTask, setIsAddingTask] = React.useState(false);
  const chevronRotation = useSharedValue(-90);
  const { data: progress } = useMilestoneProgress(milestone.id);
  const headerSwipeableRef = React.useRef<React.ComponentRef<typeof ReanimatedSwipeable>>(null);
  const [headerConfirmed, setHeaderConfirmed] = React.useState(false);

  React.useEffect(() => {
    chevronRotation.value = withTiming(isExpanded ? 0 : -90, { duration: 200 });
  }, [isExpanded, chevronRotation]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  const percent = progress?.percent ?? 0;
  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;

  // Filter to root tasks only (no subtasks)
  const rootTasks = React.useMemo(
    () => tasks.filter((t) => !t.parentTaskId),
    [tasks]
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

  const [selectedTab, setSelectedTab] = React.useState<'active' | 'completed'>('active');

  const renderHeaderRightActions = React.useCallback(
    () => <DeleteRightAction confirmed={headerConfirmed} />,
    [headerConfirmed]
  );

  const handleHeaderSwipeOpen = React.useCallback(
    (direction: 'left' | 'right') => {
      if (direction === 'left') {
        onDeleteMilestone(milestone.id);
        setHeaderConfirmed(true);
        setTimeout(() => {
          headerSwipeableRef.current?.close();
          setHeaderConfirmed(false);
        }, 1200);
      }
    },
    [milestone.id, onDeleteMilestone]
  );

  const handleAddTask = React.useCallback(() => {
    if (!isExpanded) setIsExpanded(true);
    setIsAddingTask(true);
  }, [isExpanded]);

  const headerContent = (
    <Pressable
      onPress={() => setIsExpanded(!isExpanded)}
      className="px-4 py-3 bg-background"
    >
      <View className="flex-row items-center">
        <Animated.View style={chevronStyle} className="mr-2">
          <ChevronDown size={18} color="#6B7280" />
        </Animated.View>
        <View className="flex-1">
          <Text className="text-base font-semibold">{milestone.name}</Text>
          {project && (
            <Text className="text-xs text-muted-foreground mt-0.5">
              {project.name}
              {milestone.dueDate
                ? ` · Due ${new Date(milestone.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
                : ''}
            </Text>
          )}
        </View>
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleAddTask();
          }}
          hitSlop={8}
          className="p-1 self-start"
        >
          <Plus size={20} color="#3B82F6" />
        </Pressable>
      </View>
      <View className="flex-row items-center mt-2 ml-7">
        <Text className="text-xs text-muted-foreground mr-2">
          {completed}/{total}
        </Text>
        <ProgressBar percent={percent} />
        <Text className="text-xs text-muted-foreground ml-2 w-10 text-right">
          {percent}%
        </Text>
      </View>
    </Pressable>
  );

  return (
    <View>
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

      {isExpanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)}>
          {/* Active / Completed tabs */}
          <View
            className="flex-row pb-2 pt-1"
            style={{ paddingHorizontal: 16, gap: 8 }}
          >
            <Pressable
              onPress={() => setSelectedTab('active')}
              className={`px-3 py-1.5 rounded-full border ${
                selectedTab === 'active'
                  ? 'bg-foreground border-foreground'
                  : 'border-border'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedTab === 'active' ? 'text-background' : 'text-foreground'
                }`}
              >
                Active ({activeTasks.length})
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setSelectedTab('completed')}
              className={`px-3 py-1.5 rounded-full border ${
                selectedTab === 'completed'
                  ? 'bg-foreground border-foreground'
                  : 'border-border'
              }`}
            >
              <Text
                className={`text-sm font-medium ${
                  selectedTab === 'completed' ? 'text-background' : 'text-foreground'
                }`}
              >
                Completed ({completedTasks.length})
              </Text>
            </Pressable>
          </View>

          {selectedTab === 'active' ? (
            <>
              {activeTasks.length > 0 ? (
                activeTasks.map((task, index) => (
                  <SwipeableMilestoneTask
                    key={task.id}
                    task={task}
                    tasks={allTasks}
                    onPress={() => onTaskPress(task)}
                    onToggle={() => onTaskToggle(task.id)}
                    onDeleteTask={onDeleteTask}
                    isLast={index === activeTasks.length - 1 && !isAddingTask}
                  />
                ))
              ) : !isAddingTask ? (
                <View className="items-center justify-center py-10">
                  <Text className="text-muted-foreground">No active tasks</Text>
                </View>
              ) : null}

              {isAddingTask ? (
                <InlineTaskInput
                  projectId={milestone.projectId}
                  milestoneId={milestone.id}
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
            </>
          ) : (
            <>
              {completedTasks.length === 0 ? (
                <View className="items-center justify-center py-10">
                  <Text className="text-muted-foreground">No completed tasks</Text>
                </View>
              ) : (
                completedTasks.map((task, index) => (
                  <View key={task.id} className="flex-row items-center">
                    <View className="flex-1">
                      <SwipeableMilestoneTask
                        task={task}
                        tasks={allTasks}
                        onPress={() => onTaskPress(task)}
                        onToggle={() => onTaskToggle(task.id)}
                        onDeleteTask={onDeleteTask}
                        isLast={index === completedTasks.length - 1}
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
        </Animated.View>
      )}

      <Separator />
    </View>
  );
}
