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
}

export function TaskItem({
  task,
  onPress,
  onToggle,
  subtaskProgress,
}: TaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center px-4 py-3 bg-card border-b border-border active:bg-muted"
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
        <RefreshCw size={16} color="#9CA3AF" style={{ marginRight: 8 }} />
      )}

      {/* Subtask progress */}
      {subtaskProgress && (
        <Text className="text-sm text-muted-foreground mr-2">
          {subtaskProgress.completed}/{subtaskProgress.total}
        </Text>
      )}

      {/* Drag handle - long press anywhere on item to drag */}
      <GripVertical size={20} color="#9CA3AF" />
    </Pressable>
  );
}
