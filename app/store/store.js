import { create } from 'zustand';

const store = (set) => ({
  tasks: [
    { title: 'get milk', status: 'PLANNED' },
    { title: 'get coco', status: 'ONGOING' },
  ],
});

export const useStore = create(store);
