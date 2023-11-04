import React, { useState } from 'react';

export default function Project() {
  const [project, setProject] = useState('');
  return (
    <form className="flex flex-col space-y-4" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Project Name"
        className="p-3 rounded-lg bg-[#3B3B3B]"
        onChange={(e) => setProject(e.target.value)}
      />
      <button className="p-3 bg-pink-900 rounded-lg">+ Add Project</button>
    </form>
  );
}
