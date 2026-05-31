import { create } from 'zustand';
import type { Task } from '@lucidity/shared';

interface SheetState {
  taskStack: Task[];
  isPresented: boolean;

  // Computed getters
  currentTask: () => Task | null;
  parentTask: () => Task | null;
  canGoBack: () => boolean;

  // Actions
  openSheet: (task: Task) => void;
  closeSheet: () => void;
  onDismissed: () => void;
  resetState: () => void;
  drillDown: (task: Task) => void;
  goBack: () => void;
  updateCurrentTask: (task: Task) => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  taskStack: [],
  isPresented: false,

  currentTask: () => {
    const stack = get().taskStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  parentTask: () => {
    const stack = get().taskStack;
    return stack.length > 1 ? stack[stack.length - 2] : null;
  },

  canGoBack: () => get().taskStack.length > 1,

  // Present the sheet on a fresh single-task stack. The native BottomSheet is
  // driven by `isPresented` (state), not an imperative ref.
  openSheet: (task) => set({ taskStack: [task], isPresented: true }),

  // Request dismissal. taskStack is cleared in onDismissed (after the sheet has
  // fully animated away) so the content doesn't blank mid-animation.
  closeSheet: () => set({ isPresented: false }),

  // Wired to the native BottomSheet `onDismiss` (fires post-animation).
  onDismissed: () => set({ taskStack: [] }),

  resetState: () => set({ taskStack: [], isPresented: false }),

  drillDown: (task) =>
    set((state) => ({
      taskStack: [...state.taskStack, task],
    })),

  goBack: () =>
    set((state) => ({
      taskStack: state.taskStack.slice(0, -1),
    })),

  updateCurrentTask: (task) =>
    set((state) => ({
      taskStack: [...state.taskStack.slice(0, -1), task],
    })),
}));
