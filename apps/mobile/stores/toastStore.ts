import { create } from 'zustand';

interface ToastState {
  visible: boolean;
  message: string;
  onUndo: (() => void) | null;
  timerId: ReturnType<typeof setTimeout> | null;
  showToast: (message: string, onUndo: () => void) => void;
  hideToast: () => void;
  handleUndo: () => void;
}

const TOAST_DURATION = 4000;

export const useToastStore = create<ToastState>((set, get) => ({
  visible: false,
  message: '',
  onUndo: null,
  timerId: null,

  showToast: (message, onUndo) => {
    const { timerId } = get();
    if (timerId) clearTimeout(timerId);

    const newTimerId = setTimeout(() => {
      set({ visible: false, message: '', onUndo: null, timerId: null });
    }, TOAST_DURATION);

    set({ visible: true, message, onUndo, timerId: newTimerId });
  },

  hideToast: () => {
    const { timerId } = get();
    if (timerId) clearTimeout(timerId);
    set({ visible: false, message: '', onUndo: null, timerId: null });
  },

  handleUndo: () => {
    const { onUndo, timerId } = get();
    if (timerId) clearTimeout(timerId);
    onUndo?.();
    set({ visible: false, message: '', onUndo: null, timerId: null });
  },
}));
