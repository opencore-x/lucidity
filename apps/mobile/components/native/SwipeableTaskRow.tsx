import * as React from 'react';
import { Button, SwipeActions } from '@expo/ui/swift-ui';
import { tint } from '@expo/ui/swift-ui/modifiers';
import { TaskRow } from '@/components/native/TaskRow';
import { useToggleTask, useUpdateTask } from '@/hooks/useTasks';
import { useUndoableDeleteTask } from '@/hooks/useUndoableDeleteTask';
import { useSubtaskProgress } from '@/hooks/useSubtaskProgress';
import { useSheetStore } from '@/stores/sheetStore';
import type { Task } from '@lucidity/shared';

const TODAY_AMBER = '#F59E0B';
// Indigo "Remove from Today" — matches the old Today-screen leading-action color.
const REMOVE_INDIGO = '#6366F1';

function isDueToday(dueDate: Task['dueDate']): boolean {
  if (!dueDate) return false;
  const d = new Date(dueDate);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * The canonical task row for every native list (Today / Search / Project / Milestone).
 * Owns the SwipeActions wrapper so each screen renders `<SwipeableTaskRow task={t} />`
 * instead of repeating the swipe block. Pulls its own mutations + sheet + progress, so
 * screens pass only the task. The "parent attaches swipe" rule still holds — this
 * component IS rendered as the direct child of the List/ForEach.
 *
 * Trailing actions:
 *  - Delete (destructive, undoable).
 *  - Today (toggle) — for active tasks only. Sets the due date to today, or, when the
 *    task is already due today, clears it ("Remove"). Completed rows show Delete alone.
 *
 * allowsFullSwipe is enabled only when Delete is the lone action (completed rows), so an
 * accidental full swipe never fires Delete past the Today toggle.
 */
export function SwipeableTaskRow({ task }: { task: Task }) {
  const toggleTask = useToggleTask();
  const updateTask = useUpdateTask();
  const { deleteTask } = useUndoableDeleteTask();
  const openSheet = useSheetStore((s) => s.openSheet);
  const progress = useSubtaskProgress(task.id);

  const completed = task.status === 'completed';
  const dueToday = isDueToday(task.dueDate);

  const handleToggleToday = React.useCallback(() => {
    let dueDate: Date | null = null;
    if (!dueToday) {
      dueDate = new Date();
      dueDate.setHours(0, 0, 0, 0);
    }
    updateTask.mutate({ id: task.id, data: { dueDate } });
  }, [dueToday, task.id, updateTask]);

  return (
    <SwipeActions>
      <TaskRow
        task={task}
        progress={progress}
        onToggle={() => toggleTask.mutate(task.id)}
        onOpen={() => openSheet(task)}
      />
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={completed}>
        <Button
          label="Delete"
          systemImage="trash"
          role="destructive"
          onPress={() => deleteTask(task.id)}
        />
        {!completed ? (
          <Button
            label={dueToday ? 'Remove' : 'Today'}
            systemImage={dueToday ? 'calendar.badge.minus' : 'calendar'}
            onPress={handleToggleToday}
            modifiers={[tint(dueToday ? REMOVE_INDIGO : TODAY_AMBER)]}
          />
        ) : null}
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
