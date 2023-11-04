import React from 'react';

export default function Page() {
  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col mt-20 w-80 space-y-4">
        <input
          type="text"
          placeholder="Project Name"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <button type="submit" className="p-3 bg-pink-900 rounded-lg">
          Add Button
        </button>
      </form>
    </div>
  );
}
