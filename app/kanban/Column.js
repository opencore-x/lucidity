'use client';
import React from 'react';
import Task from './Task';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

export default function Column({ status }) {
  const tasks = useStore((store) => store.tasks.filter((task) => task.status === status), shallow);

  return (
    <div className="flex flex-col justify-between gap-4 w-80 p-4  min-h-[300px] bg-gray-600  rounded-xl">
      <div className="flex flex-col gap-4">
        {tasks.map((task) => (
          <Task title={task.title} status={task.status} key={task.title} />
        ))}
      </div>

      <div className="flex justify-between">
        <button className="font-bold text-gray-400 ">+ add new task</button>
        <p className="text-gray-300 font-semibold">{status}</p>
      </div>
    </div>
  );
}
