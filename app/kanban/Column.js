'use client';
import React, { useEffect, useRef, useState } from 'react';
import Task from './Task';
import { useStore } from '../store/store';
import { shallow } from 'zustand/shallow';

export default function Column({ status }) {
  const [task, setTask] = useState('');
  const [isEnterTaskVisible, setIsEnterTaskVisible] = useState(false);
  const newTaskInput = useRef(null);

  const tasks = useStore(
    (store) => store.tasks.filter((task) => task.status === status),
    shallow,
  );
  const addTask = useStore((store) => store.addTask);

  useEffect(() => {
    if (isEnterTaskVisible) newTaskInput.current.focus();
  }, [isEnterTaskVisible]);

  return (
    <>
      <div
        className="flex flex-col justify-between gap-6 w-full h-fit p-4 min-h-[350px] bg-gray-600  rounded-xl"
        onDragOver={(e) => e.preventDefault()}
      >
        <div>
          <div className="flex justify-between mb-6">
            <div></div>
            <p className="text-gray-300 font-semibold">{status}</p>
          </div>
          <div className="flex flex-col gap-4">
            {tasks.map((task) => (
              <Task title={task.title} status={task.status} key={task.title} />
            ))}
          </div>
        </div>

        <div className="flex flex-col ">
          {!isEnterTaskVisible && (
            <button
              className="font-bold text-gray-400 text-left"
              onClick={() => {
                setIsEnterTaskVisible(true);
              }}
            >
              + add new task
            </button>
          )}

          {isEnterTaskVisible && (
            <div className="flex gap-2 justify-between">
              <input
                className="p-3 w-full rounded-lg bg-gray-800 text-gray-300"
                type="text"
                placeholder="add new task"
                value={task}
                onChange={(e) => setTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTask(task, status);
                    setTask('');
                  }
                }}
                ref={newTaskInput}
              />
              <button
                className="bg-green-600 p-3 rounded-lg font-semibold"
                onClick={() => {
                  addTask(task, status);
                  setTask('');
                }}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
