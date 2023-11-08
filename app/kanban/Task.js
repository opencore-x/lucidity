import React from 'react';

export default function Task({ title, status }) {
  return (
    <div className="flex flex-col justify-between text-black bg-gray-300 rounded-lg  p-3 h-28 w-full">
      <div>{title}</div>
      <div>
        <div className="flex justify-between">
          <div></div>
          <div className="font-bold text-xs text-pink-900 bg-pink-400 px-2 py-1 rounded-lg w-fit">
            {status}
          </div>
        </div>
      </div>
    </div>
  );
}
