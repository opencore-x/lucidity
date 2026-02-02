import * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { GripVertical, RefreshCw } from '@/lib/icons';
import type { Task } from '@lucidity/shared';

interface TaskItemProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  subtaskProgress: { completed: number; total: number } | null;
  isLast?: boolean;
}

export function TaskItem({
  task,
  onPress,
  onToggle,
  subtaskProgress,
  isLast,
}: TaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        'flex-row items-center px-4 py-2 bg-card active:bg-muted',
        !isLast && 'border-b border-border'
      )}
    >
      {/* Checkbox - stops propagation to handle its own press */}
      <Pressable onPress={onToggle} className="mr-3" hitSlop={8}>
        <Checkbox checked={isCompleted} onCheckedChange={onToggle} />
      </Pressable>

      {/* Title */}
      <Text
        className={cn(
          'flex-1 text-base',
          isCompleted && 'line-through text-muted-foreground'
        )}
        numberOfLines={2}
      >
        {task.title}
      </Text>

      {/* Recurring indicator */}
      {task.recurringFrequency && (
        <RefreshCw size={16} color="#9CA3AF" style={{ marginRight: 12 }} />
      )}

      {/* Subtask progress */}
      {subtaskProgress && (
        <Text className="text-sm text-muted-foreground" style={{ marginRight: 12 }}>
          {subtaskProgress.completed} of {subtaskProgress.total}
        </Text>
      )}

      {/* Drag handle - long press anywhere on item to drag */}
      <GripVertical size={20} color="#9CA3AF" style={{ marginLeft: 4 }} />
    </Pressable>
  );
}
