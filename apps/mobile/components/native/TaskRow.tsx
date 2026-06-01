import * as React from 'react';
import { HStack, Spacer, Image, Text } from '@expo/ui/swift-ui';
import {
  contentShape,
  shapes,
  onTapGesture,
  foregroundStyle,
  lineLimit,
  frame,
  font,
} from '@expo/ui/swift-ui/modifiers';
import { formatRelativeTime } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const DONE_GREEN = '#22C55E';
const CHECKBOX_GRAY = '#C7C7CC';

type DueInfo = { label: string; color: string } | null;

// Mirrors TaskItem's due-date buckets, minus the fade animation (static here).
function getDueInfo(dueDate: string | Date | null | undefined): DueInfo {
  if (!dueDate) return null;
  const due = new Date(dueDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
  const diffDays = Math.round((dueDay.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return { label: 'Overdue', color: '#EF4444' };
  if (diffDays === 0) return { label: 'Today', color: '#F59E0B' };
  if (diffDays === 1) return { label: 'Tomorrow', color: '#F97316' };
  if (diffDays <= 6)
    return { label: due.toLocaleDateString('en-US', { weekday: 'short' }), color: '#6B7280' };
  return {
    label: due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    color: '#6B7280',
  };
}

function getReminderColor(reminderAt: string | Date | null | undefined): string | null {
  if (!reminderAt) return null;
  const diffMs = new Date(reminderAt).getTime() - Date.now();
  if (diffMs < 0) return '#EF4444'; // passed
  if (diffMs < 3600000) return '#F59E0B'; // within the hour
  return '#6B7280';
}

/**
 * A native @expo/ui task row for the project / Inbox lists — a circular checkbox
 * (tap to toggle), the title (strikethrough + gray when complete), and trailing
 * status (subtask progress, recurring, reminder, due date; or the completed-at time
 * for done tasks). The whole row is tappable to open the task sheet. Swipe actions
 * are attached by the parent List.
 */
export function TaskRow({
  task,
  progress,
  onToggle,
  onOpen,
}: {
  task: Task;
  progress: { completed: number; total: number } | null;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const completed = task.status === 'completed';
  const due = completed ? null : getDueInfo(task.dueDate);
  const reminderColor = completed ? null : getReminderColor(task.reminderAt);

  return (
    <HStack spacing={10} modifiers={[contentShape(shapes.rectangle()), onTapGesture(onOpen)]}>
      <Image
        systemName={completed ? 'checkmark.circle.fill' : 'circle'}
        size={22}
        color={completed ? DONE_GREEN : CHECKBOX_GRAY}
        onPress={onToggle}
      />
      <Text
        modifiers={[
          lineLimit(2),
          frame({ maxWidth: Infinity, alignment: 'leading' }),
          ...(completed ? [foregroundStyle(MUTED_GRAY)] : []),
        ]}>
        {task.title}
      </Text>

      {completed ? (
        task.completedAt ? (
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 12 })]}>
            {formatRelativeTime(task.completedAt)}
          </Text>
        ) : null
      ) : (
        <>
          {task.recurringFrequency ? (
            <Image systemName="repeat" size={13} color={MUTED_GRAY} />
          ) : null}
          {progress ? (
            <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: 13 })]}>
              {`${progress.completed}/${progress.total}`}
            </Text>
          ) : null}
          {reminderColor ? <Image systemName="bell.fill" size={12} color={reminderColor} /> : null}
          {due ? (
            <HStack spacing={3}>
              <Image systemName="calendar" size={11} color={due.color} />
              <Text modifiers={[foregroundStyle(due.color), font({ size: 12 })]}>{due.label}</Text>
            </HStack>
          ) : null}
        </>
      )}
    </HStack>
  );
}
