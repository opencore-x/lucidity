import React, { useState } from 'react';

export default function Project() {
  const [project, setProject] = useState('');
  return (
    <form className="flex flex-col space-y-3" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Enter project name"
        className="p-3 h-14 rounded-xl bg-[#3B3B3B]"
        onChange={(e) => setProject(e.target.value)}
      />
      <button className="p-3 h-14 bg-pink-900 rounded-xl">add a new project</button>
    </form>
  );
}
