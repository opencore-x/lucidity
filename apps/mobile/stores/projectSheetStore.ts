import { create } from 'zustand';
import type { Project } from '@lucidity/shared';

interface ProjectSheetState {
  project: Project | null;
  isPresented: boolean;

  openSheet: (project: Project) => void;
  closeSheet: () => void;
  onDismissed: () => void;
  updateProject: (project: Project) => void;
}

/**
 * State-driven store for the global native (@expo/ui) project editor sheet.
 * Mirrors `sheetStore`: the BottomSheet is driven by `isPresented` (not an
 * imperative ref). `project` holds the open project; `onDismissed` clears it after
 * the sheet has animated away so the content doesn't blank mid-dismiss.
 */
export const useProjectSheetStore = create<ProjectSheetState>((set) => ({
  project: null,
  isPresented: false,

  openSheet: (project) => set({ project, isPresented: true }),
  closeSheet: () => set({ isPresented: false }),
  onDismissed: () => set({ project: null }),
  updateProject: (project) => set({ project }),
}));
