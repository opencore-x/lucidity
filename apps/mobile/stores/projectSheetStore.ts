import { create } from 'zustand';
import type { Project } from '@lucidity/shared';

interface ProjectSheetState {
  isOpen: boolean;
  project: Project | null;

  openSheet: (project: Project) => void;
  closeSheet: () => void;
}

export const useProjectSheetStore = create<ProjectSheetState>((set) => ({
  isOpen: false,
  project: null,

  openSheet: (project) =>
    set({
      isOpen: true,
      project,
    }),

  closeSheet: () =>
    set({
      isOpen: false,
      project: null,
    }),
}));
