import React from 'react';

export default function Task({ title, status }) {
  const color = 'bg-pink-400';
  return (
    <div className="flex flex-col justify-between text-black bg-gray-300 rounded-lg p-3 h-24 w-full">
      <div className="text-md first-letter:capitalize font-medium">{title}</div>
      <div>
        <div className="flex justify-between">
          <div></div>
          <div
            className={`font-bold text-xs text-pink-900 ${color} px-2 py-1 rounded-lg w-fit`}
          >
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
