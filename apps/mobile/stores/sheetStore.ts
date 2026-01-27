import { create } from 'zustand';
import type { Task } from '@opentask/shared';

interface SheetState {
  isOpen: boolean;
  taskStack: Task[];
  mode: 'view' | 'create';
  createProjectId: string | null;

  // Computed getters
  currentTask: () => Task | null;
  parentTask: () => Task | null;
  canGoBack: () => boolean;

  // Actions
  openSheet: (task: Task) => void;
  openCreateSheet: (projectId: string) => void;
  closeSheet: () => void;
  drillDown: (task: Task) => void;
  goBack: () => void;
  updateCurrentTask: (task: Task) => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  isOpen: false,
  taskStack: [],
  mode: 'view',
  createProjectId: null,

  currentTask: () => {
    const stack = get().taskStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  parentTask: () => {
    const stack = get().taskStack;
    return stack.length > 1 ? stack[stack.length - 2] : null;
  },

  canGoBack: () => get().taskStack.length > 1,

  openSheet: (task) =>
    set({
      isOpen: true,
      taskStack: [task],
      mode: 'view',
      createProjectId: null,
    }),

  openCreateSheet: (projectId) =>
    set({
      isOpen: true,
      taskStack: [],
      mode: 'create',
      createProjectId: projectId,
    }),

  closeSheet: () =>
    set({
      isOpen: false,
      taskStack: [],
      mode: 'view',
      createProjectId: null,
    }),

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
