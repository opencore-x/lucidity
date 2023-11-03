import React from 'react';

export default function Page() {
  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col mt-20 w-80 space-y-4">
        <input
          type="text"
          placeholder="Task Title"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <textarea
          className="p-3 h-20 rounded-lg bg-[#3B3B3B]"
          placeholder="Description"
        ></textarea>

        <select
          name="Project"
          className="p-3 rounded-lg bg-[#3B3B3B] text-[#999]"
        >
          <option value="" selected disabled>
            Select project
          </option>
          <option>A</option>
          <option>B</option>
          <option>C</option>
        </select>
        <div className="space-x-3 flex">
          <input
            placeholder="Priority"
            className="p-3 w-28 rounded-lg bg-[#3B3B3B]"
          />

          <button className="p-3 bg-pink-900 w-20 rounded-lg">1</button>
          <button className="p-3 bg-pink-900 w-20 rounded-lg">2</button>
          <button className="p-3 bg-pink-900 w-20 rounded-lg">3</button>
        </div>
        <input type="date" className="p-3 rounded-lg bg-[#3B3B3B]" />
        <button className="p-3 bg-pink-900 rounded-lg">+ add task</button>
      </form>
    </div>
  );
}
