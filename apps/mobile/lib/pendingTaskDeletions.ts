// Task ids that have been optimistically removed but whose server DELETE hasn't been
// confirmed yet (the delete is delayed by a 4s undo window). `useTasks` filters these out,
// so a refetch landing mid-window — from window focus, another mutation's invalidation, or
// a sibling delete settling — can't resurrect a row that's on its way out.
//
// Module-level on purpose: useUndoableDeleteTask runs per row (it's called inside
// SwipeableTaskRow), so this has to be shared across every instance.
export const pendingTaskDeletions = new Set<string>();
