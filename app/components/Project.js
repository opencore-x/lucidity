import React, { useState } from 'react';

export default function Project() {
  const [project, setProject] = useState('');
  return (
    <div className="flex flex-col space-y-3">
      <input
        type="text"
        placeholder="Enter project name"
        className="p-4 h-16 rounded-xl bg-[#3B3B3B]"
        onChange={(e) => setProject(e.target.value)}
      />
      <button type="button" className="h-16 bg-pink-900 rounded-xl">
        add a new project
      </button>
    </div>
  );
}
