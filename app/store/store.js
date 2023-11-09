import { create } from 'zustand';

const store = (set) => ({
  tasks: [
    { title: 'get milk', status: 'PLANNED' },
    { title: 'get coco', status: 'ONGOING' },
    { title: 'study zustand', status: 'ONGOING' },
  ],
  addTask: (title, status) =>
    set((store) => ({ tasks: [...store.tasks, { title, status }] })),
  deleteTask: (title) =>
    set((store) => ({
      tasks: store.tasks.filter((task) => task.title !== title),
    })),
});

export const useStore = create(store);
