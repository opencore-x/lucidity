import * as React from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withDelay, withTiming } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { RefreshCw, Calendar } from '@/lib/icons';
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
    progress.value = withDelay(3000, withTiming(0, { duration: 400 }));
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

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center bg-card px-4 py-2 active:bg-muted',
        !isLast && 'border-b border-border'
      )}>
      {/* Checkbox */}
      <Pressable onPress={onToggle} className="mr-3" hitSlop={8}>
        <Checkbox checked={isCompleted} onCheckedChange={onToggle} />
      </Pressable>

      {/* Title */}
      <Text
        className={cn('flex-1 text-base font-medium', isCompleted && 'text-muted-foreground')}
        numberOfLines={2}>
        {task.title}
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

      {/* Due date label — visible for 3s then fades out */}
      {dueInfo && !(isCompleted && dueInfo.status === 'overdue') && <DueDateLabel dueInfo={dueInfo} />}
    </Pressable>
  );
}
