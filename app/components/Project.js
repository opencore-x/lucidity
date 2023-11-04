import React, { useState } from 'react';

export default function Project() {
  const [project, setProject] = useState('');
  return (
    <form className="flex flex-col space-y-3" onSubmit={(e) => e.preventDefault()}>
      <input
        type="text"
        placeholder="Enter project Name"
        className="p-3 rounded-xl bg-[#3B3B3B]"
        onChange={(e) => setProject(e.target.value)}
      />
      <button className="p-3 bg-pink-900 rounded-lg">+ Add Project</button>
    </form>
  );
}
