import * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { GripVertical } from '@/lib/icons';
import type { Task } from '@lucidity/shared';

interface SubtaskItemProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  subtaskProgress: { completed: number; total: number } | null;
}

export function SubtaskItem({
  task,
  onPress,
  onToggle,
  subtaskProgress,
}: SubtaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center py-3 px-4 bg-card border-b border-border active:bg-muted"
    >
      {/* Checkbox */}
      <Pressable onPress={onToggle} className="mr-3" hitSlop={8}>
        <Checkbox checked={isCompleted} onCheckedChange={onToggle} />
      </Pressable>

      {/* Title */}
      <Text
        className={cn(
          'flex-1 text-base',
          isCompleted && 'line-through text-muted-foreground'
        )}
        numberOfLines={1}
      >
        {task.title}
      </Text>

      {/* Nested subtask progress */}
      {subtaskProgress && (
        <Text className="text-sm text-muted-foreground mr-2">
          {subtaskProgress.completed}/{subtaskProgress.total}
        </Text>
      )}

      {/* Drag handle - on the right like main screen */}
      <GripVertical size={20} color="#9CA3AF" />
    </Pressable>
  );
}
