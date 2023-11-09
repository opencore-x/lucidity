import React from 'react';
import { useStore } from '../store/store';

export default function Task({ title, status }) {
  const deleteTask = useStore((store) => store.deleteTask);

  let bgStatus = '';
  const bgPlanned = 'bg-pink-400 text-pink-900';
  const bgOngoing = 'bg-yellow-500 text-yellow-900';
  const bgDone = 'bg-green-500 text-green-900';

  status === 'PLANNED'
    ? (bgStatus = bgPlanned)
    : status === 'ONGOING'
    ? (bgStatus = bgOngoing)
    : (bgStatus = bgDone);

  return (
    <div
      className="flex flex-col justify-between text-black bg-gray-300 rounded-lg p-3 h-24 w-full"
      draggable
    >
      <div className="text-md first-letter:capitalize font-medium">{title}</div>
      <div>
        <div className="flex justify-between">
          <button
            className="text-sm font-semibold underline underline-offset-4"
            onClick={() => deleteTask(title)}
          >
            Delete
          </button>
          <div
            className={`font-bold text-xs ${bgStatus} px-2 py-1 rounded-lg w-fit`}
          >
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
