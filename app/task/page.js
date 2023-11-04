'use client';
import React, { useState } from 'react';
import Project from '../components/Project';

export default function Page() {
  const [taskName, setTaskName] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState(null);
  const [priority, setPriority] = useState(null);
  const [dueDate, setDueDate] = useState(null);
  const [isAddProjectVisible, setIsAddProjectVisible] = useState(false);

  return (
    <div className="flex h-screen justify-center">
      <form className="flex flex-col mt-20 w-80 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <input
          type="text"
          placeholder="Enter task"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setTaskName(e.target.value)}
        />
        <textarea
          className="p-3 h-20 rounded-lg bg-[#3B3B3B]"
          placeholder="Description"
          onChange={(e) => setDescription(e.target.value)}
        />
        <select
          name="Project"
          className="p-3 rounded-lg bg-[#3B3B3B] text-[#999]"
          onChange={(e) => setProject(e.target.value)}
        >
          <option value="" selected disabled>
            Select project
          </option>
          <option>solsense</option>
          <option>to-do</option>
          <option>Haayi</option>
        </select>
        <button className="text-green-400" onClick={() => setIsAddProjectVisible(!isAddProjectVisible)}>
          {isAddProjectVisible ? 'cancel' : ' + add a new project'}
        </button>
        {isAddProjectVisible && <Project />}

        <div className="space-x-3 flex">
          <input
            placeholder="Priority"
            className="p-3 w-28 rounded-lg bg-[#3B3B3B] text-center"
            onChange={(e) => setPriority(e.target.value)}
            value={priority}
          />
          <button className="p-3 bg-pink-900 w-20 rounded-lg" onClick={() => setPriority(1)}>
            1
          </button>
          <button className="p-3 bg-pink-900 w-20 rounded-lg" onClick={() => setPriority(2)}>
            2
          </button>
          <button className="p-3 bg-pink-900 w-20 rounded-lg" onClick={() => setPriority(3)}>
            3
          </button>
        </div>
        <input
          type="date"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setDueDate(e.target.value)}
        />
        {taskName}
        {description}
        {project}
        {priority}
        {dueDate}
        <button className="p-3 bg-pink-900 rounded-lg">+ add task</button>
      </form>
    </div>
  );
}
