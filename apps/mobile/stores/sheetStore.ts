import { createRef } from 'react';
import { create } from 'zustand';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Task } from '@lucidity/shared';

const sheetRef = createRef<BottomSheetModal>();

interface SheetState {
  taskStack: Task[];
  mode: 'view' | 'create';
  createProjectId: string | null;
  sheetRef: typeof sheetRef;

  // Computed getters
  currentTask: () => Task | null;
  parentTask: () => Task | null;
  canGoBack: () => boolean;

  // Actions
  openSheet: (task: Task) => void;
  openCreateSheet: (projectId: string) => void;
  closeSheet: () => void;
  resetState: () => void;
  drillDown: (task: Task) => void;
  goBack: () => void;
  updateCurrentTask: (task: Task) => void;
}

export const useSheetStore = create<SheetState>((set, get) => ({
  taskStack: [],
  mode: 'view',
  createProjectId: null,
  sheetRef,

  currentTask: () => {
    const stack = get().taskStack;
    return stack.length > 0 ? stack[stack.length - 1] : null;
  },

  parentTask: () => {
    const stack = get().taskStack;
    return stack.length > 1 ? stack[stack.length - 2] : null;
  },

  canGoBack: () => get().taskStack.length > 1,

  openSheet: (task) => {
    set({ taskStack: [task], mode: 'view', createProjectId: null });
    sheetRef.current?.present();
  },

  openCreateSheet: (projectId) => {
    set({ taskStack: [], mode: 'create', createProjectId: projectId });
    sheetRef.current?.present();
  },

  closeSheet: () => {
    sheetRef.current?.dismiss();
  },

  resetState: () => {
    set({ taskStack: [], mode: 'view', createProjectId: null });
  },

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
