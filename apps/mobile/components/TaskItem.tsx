import * as React from 'react';
import { View } from 'react-native';
import { Pressable } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { Bell, RefreshCw, Calendar } from '@/lib/icons';
import { FONTS } from '@/lib/fonts';
import type { Task } from '@lucidity/shared';

type DueStatus = 'overdue' | 'today' | 'tomorrow' | 'upcoming' | null;

function getDueInfo(dueDate: string | Date | null | undefined): {
  label: string;
  status: DueStatus;
  color: string;
} | null {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return { label: 'Overdue', status: 'overdue', color: '#EF4444' };
  }
  if (diffDays === 0) {
    return { label: 'Today', status: 'today', color: '#F59E0B' };
  }
  if (diffDays === 1) {
    return { label: 'Tomorrow', status: 'tomorrow', color: '#F97316' };
  }
  if (diffDays <= 6) {
    const dayName = due.toLocaleDateString('en-US', { weekday: 'short' });
    return { label: dayName, status: 'upcoming', color: '#6B7280' };
  }
  const formatted = due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return { label: formatted, status: 'upcoming', color: '#6B7280' };
}

function DueDateLabel({ dueInfo }: { dueInfo: { label: string; color: string } }) {
  const progress = useSharedValue(1);
  const measuredWidth = useSharedValue(0);
  const hasMeasured = useSharedValue(false);

  React.useEffect(() => {
    progress.value = withDelay(1000, withTiming(0, { duration: 300 }));
  }, [progress]);

  const containerStyle = useAnimatedStyle(() => ({
    width: hasMeasured.value ? measuredWidth.value * progress.value : undefined,
    opacity: progress.value,
    overflow: 'hidden' as const,
  }));

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 8 }}>
      <Calendar size={12} color={dueInfo.color} />
      <Animated.View
        style={[{ flexDirection: 'row', marginLeft: 3 }, containerStyle]}
        onLayout={(e) => {
          if (!hasMeasured.value) {
            measuredWidth.value = e.nativeEvent.layout.width;
            hasMeasured.value = true;
          }
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '500', fontFamily: FONTS.medium, color: dueInfo.color }} numberOfLines={1}>
          {dueInfo.label}
        </Text>
      </Animated.View>
    </View>
  );
}

function getReminderColor(reminderAt: string | Date | null | undefined): string | null {
  if (!reminderAt) return null;
  const reminder = new Date(reminderAt);
  const now = new Date();
  const diffMs = reminder.getTime() - now.getTime();
  if (diffMs < 0) return '#EF4444'; // red — passed
  if (diffMs < 60 * 60 * 1000) return '#F59E0B'; // amber — within 1 hour
  return '#6B7280'; // gray — future
}

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  subtaskProgress: { completed: number; total: number } | null;
  isLast?: boolean;
}

export function TaskItem({ task, onPress, onToggle, subtaskProgress, isLast }: TaskItemProps) {
  const isCompleted = task.status === 'completed';
  const dueInfo = getDueInfo(task.dueDate);
  const reminderColor = !isCompleted ? getReminderColor(task.reminderAt) : null;

  // NOTE: `Pressable` is imported from react-native-gesture-handler, NOT
  // react-native. On the new architecture (RN 0.85 / Fabric) RN's Pressable
  // touch-responder does not fire when nested inside a GestureDetector (the
  // drag Pan in DraggableTask captures the pointer). RNGH's Pressable takes
  // part in native gesture arbitration, so it coordinates with the long-press
  // drag Pan and the Swipeable. className stays on inner Views (NativeWind does
  // not interop the RNGH Pressable).
  return (
    <Pressable onPress={onPress}>
      <View
        className={cn(
          'flex-row items-center bg-card px-4 py-2.5',
          !isLast && 'border-b border-border'
        )}>
        {/* Checkbox */}
        <Pressable onPress={onToggle} hitSlop={8}>
          <View className="mr-3">
            <Checkbox checked={isCompleted} onCheckedChange={onToggle} />
          </View>
        </Pressable>

        {/* Title + task number */}
        <Text
          className={cn('flex-1 text-base font-medium', isCompleted && 'text-muted-foreground')}
          numberOfLines={2}>
          {task.title}
          {task.taskNumber != null && (
            <Text className="text-xs text-muted-foreground opacity-60"> #{task.taskNumber}</Text>
          )}
        </Text>

        {/* Recurring indicator */}
        {task.recurringFrequency && (
          <RefreshCw size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
        )}

        {/* Subtask progress */}
        {subtaskProgress && (
          <Text className="text-sm text-muted-foreground" style={{ marginRight: 8 }}>
            {subtaskProgress.completed} of {subtaskProgress.total}
          </Text>
        )}

        {/* Reminder bell indicator */}
        {reminderColor && (
          <Bell size={14} color={reminderColor} style={{ marginRight: 6 }} />
        )}

        {/* Due date label — visible for 3s then fades out */}
        {dueInfo && !(isCompleted && dueInfo.status === 'overdue') && <DueDateLabel dueInfo={dueInfo} />}
      </View>
    </Pressable>
  );
}
