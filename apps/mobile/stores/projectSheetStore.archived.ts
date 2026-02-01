import { createRef } from 'react';
import { create } from 'zustand';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import type { Project } from '@lucidity/shared';

const sheetRef = createRef<BottomSheetModal>();

interface ProjectSheetState {
  project: Project | null;
  sheetRef: typeof sheetRef;

  openSheet: (project: Project) => void;
  closeSheet: () => void;
  clearProject: () => void;
}

export const useProjectSheetStore = create<ProjectSheetState>((set) => ({
  project: null,
  sheetRef,

  openSheet: (project) => {
    set({ project });
    sheetRef.current?.present();
  },

  closeSheet: () => {
    sheetRef.current?.dismiss();
  },

  clearProject: () => {
    set({ project: null });
  },
}));
