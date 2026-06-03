import * as React from 'react';
import { HStack, VStack, Image, Text } from '@expo/ui/swift-ui';
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

// Second-line metadata is deliberately small + quiet.
const META_ICON = 11;
const META_FONT = 12;

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
 * A native @expo/ui task row for the project / Inbox / Today / Search lists. The checkbox
 * (tap to toggle) sits beside a VStack of the title (full width, so it rarely truncates)
 * and a quieter second line of metadata — task number, recurring ↻, subtask progress,
 * reminder 🔔, and the due-date pill (or, for completed tasks, the completed-at time).
 * Tasks with no metadata collapse to a single line. The whole row opens the task sheet;
 * swipe actions are attached by the parent List.
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

  // Build the quiet second line. Order: #number, then recurring / progress / reminder /
  // due for active tasks, or the completed-at time for done ones.
  const meta: React.ReactNode[] = [];
  if (task.taskNumber != null) {
    meta.push(
      <Text key="num" modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
        {`#${task.taskNumber}`}
      </Text>
    );
  }
  if (completed) {
    if (task.completedAt) {
      meta.push(
        <Text key="done" modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
          {formatRelativeTime(task.completedAt)}
        </Text>
      );
    }
  } else {
    if (task.recurringFrequency) {
      meta.push(<Image key="repeat" systemName="repeat" size={META_ICON} color={MUTED_GRAY} />);
    }
    if (progress) {
      meta.push(
        <Text key="progress" modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
          {`${progress.completed}/${progress.total}`}
        </Text>
      );
    }
    if (reminderColor) {
      meta.push(<Image key="bell" systemName="bell.fill" size={META_ICON} color={reminderColor} />);
    }
    if (due) {
      meta.push(
        <HStack key="due" spacing={3}>
          <Image systemName="calendar" size={META_ICON} color={due.color} />
          <Text modifiers={[foregroundStyle(due.color), font({ size: META_FONT })]}>
            {due.label}
          </Text>
        </HStack>
      );
    }
  }

  return (
    <HStack spacing={10} alignment="top" modifiers={[contentShape(shapes.rectangle()), onTapGesture(onOpen)]}>
      <Image
        systemName={completed ? 'checkmark.circle.fill' : 'circle'}
        size={22}
        color={completed ? DONE_GREEN : CHECKBOX_GRAY}
        onPress={onToggle}
      />
      <VStack spacing={5} alignment="leading" modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
        <Text
          modifiers={[
            font({ size: 16 }),
            lineLimit(2),
            frame({ maxWidth: Infinity, alignment: 'leading' }),
            ...(completed ? [foregroundStyle(MUTED_GRAY)] : []),
          ]}>
          {task.title}
        </Text>
        {meta.length > 0 ? (
          <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
            {meta}
          </HStack>
        ) : null}
      </VStack>
    </HStack>
  );
}
