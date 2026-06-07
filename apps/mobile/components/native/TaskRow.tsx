import * as React from 'react';
import { HStack, VStack, Image, Text, ProgressView } from '@expo/ui/swift-ui';
import {
  contentShape,
  shapes,
  onTapGesture,
  foregroundStyle,
  lineLimit,
  frame,
  font,
  glassEffect,
  padding,
  controlSize,
  scaleEffect,
  tint,
} from '@expo/ui/swift-ui/modifiers';
import { formatRelativeTime } from '@/utils/helpers';
import type { Task } from '@lucidity/shared';

const MUTED_GRAY = '#8E8E93';
const DONE_GREEN = '#22C55E';
const CHECKBOX_GRAY = '#C7C7CC';

// Second-line metadata is deliberately small + quiet.
const META_ICON = 11;
const META_FONT = 12;

// Color-coded status shown as a small glass pill (matches the task sheet StatusPill).
// `pending` (the default) and `completed` (green checkmark + done time) are conveyed
// elsewhere, so they're omitted here.
const STATUS_META: Record<string, { label: string; color: string }> = {
  in_progress: { label: 'In Progress', color: '#3B82F6' },
  blocked: { label: 'Blocked', color: '#EF4444' },
  deferred: { label: 'Deferred', color: '#F59E0B' },
};

// Shared glass-capsule style for every second-line metadata chip.
const CHIP_MODS = [
  padding({ horizontal: 8, vertical: 3 }),
  glassEffect({ glass: { variant: 'regular' }, shape: 'capsule' }),
];

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

  // Build the quiet second line of glass chips. Order: #number (always first), status,
  // then recurring / progress / reminder / due for active tasks, or the completed-at time
  // for done ones.
  const meta: React.ReactNode[] = [];
  if (task.taskNumber != null) {
    meta.push(
      <HStack key="num" modifiers={CHIP_MODS}>
        <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
          {`#${task.taskNumber}`}
        </Text>
      </HStack>
    );
  } else if (task.projectId != null) {
    // The server assigns the per-project #number on insert (and reassigns it on a
    // project move), so a project task with no number yet is mid-flight — the
    // optimistic row before the create/update refetch lands. Show a spinner in the
    // #number pill's place so the ~1s gap reads as "assigning a number" rather than a
    // pill popping in late. Inbox tasks (projectId null) never get a number, so they
    // correctly show nothing here.
    meta.push(
      <HStack key="num" modifiers={CHIP_MODS}>
        <ProgressView modifiers={[controlSize('mini'), scaleEffect(0.7), tint(MUTED_GRAY)]} />
      </HStack>
    );
  }
  const statusMeta = completed ? undefined : STATUS_META[task.status];
  if (statusMeta) {
    meta.push(
      <HStack key="status" spacing={5} modifiers={CHIP_MODS}>
        <Image systemName="circle.fill" size={5} color={statusMeta.color} />
        <Text modifiers={[foregroundStyle(statusMeta.color), font({ size: META_FONT })]}>
          {statusMeta.label}
        </Text>
      </HStack>
    );
  }
  if (completed) {
    if (task.completedAt) {
      meta.push(
        <HStack key="done" modifiers={CHIP_MODS}>
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
            {formatRelativeTime(task.completedAt)}
          </Text>
        </HStack>
      );
    }
  } else {
    if (task.recurringFrequency) {
      meta.push(
        <HStack key="repeat" modifiers={CHIP_MODS}>
          <Image systemName="repeat" size={META_ICON} color={MUTED_GRAY} />
        </HStack>
      );
    }
    if (progress) {
      meta.push(
        <HStack key="progress" modifiers={CHIP_MODS}>
          <Text modifiers={[foregroundStyle(MUTED_GRAY), font({ size: META_FONT })]}>
            {`${progress.completed}/${progress.total}`}
          </Text>
        </HStack>
      );
    }
    if (reminderColor) {
      meta.push(
        <HStack key="bell" modifiers={CHIP_MODS}>
          <Image systemName="bell.fill" size={META_ICON} color={reminderColor} />
        </HStack>
      );
    }
    if (due) {
      meta.push(
        <HStack key="due" spacing={3} modifiers={CHIP_MODS}>
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
        {/* The metadata line is ALWAYS rendered (with a transparent, chip-height
            placeholder when empty) so a row never changes height as chips come and go —
            e.g. swiping a metadata-less task to "Today" adds the due pill without the
            1-line→2-line jump that made the swipe feel jerky. */}
        <HStack spacing={8} modifiers={[frame({ maxWidth: Infinity, alignment: 'leading' })]}>
          {meta.length > 0 ? (
            meta
          ) : (
            <Text
              modifiers={[
                font({ size: META_FONT }),
                padding({ vertical: 3 }),
                foregroundStyle('#00000000'),
              ]}>
              {' '}
            </Text>
          )}
        </HStack>
      </VStack>
    </HStack>
  );
}
