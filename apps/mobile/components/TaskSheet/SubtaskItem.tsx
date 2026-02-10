import * as React from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import type { Task } from '@lucidity/shared';

interface SubtaskItemProps {
  task: Task;
  onPress: () => void;
  onToggle: () => void;
  subtaskProgress: { completed: number; total: number } | null;
}

export function SubtaskItem({ task, onPress, onToggle, subtaskProgress }: SubtaskItemProps) {
  const isCompleted = task.status === 'completed';

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center border-b border-border bg-card px-4 py-3 active:bg-muted">
      {/* Checkbox */}
      <Pressable onPress={onToggle} className="mr-3" hitSlop={8}>
        <Checkbox checked={isCompleted} onCheckedChange={onToggle} />
      </Pressable>

      {/* Title */}
      <Text
        className={cn('flex-1 text-base', isCompleted && 'text-muted-foreground')}
        numberOfLines={1}>
        {task.title}
      </Text>

      {/* Nested subtask progress */}
      {subtaskProgress && (
        <Text className="mr-2 text-sm text-muted-foreground">
          {subtaskProgress.completed}/{subtaskProgress.total}
        </Text>
      )}
    </Pressable>
  );
}
