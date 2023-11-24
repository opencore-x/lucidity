'use client';

import { useEffect, useState } from 'react';
import NewTask from './components/NewTask';
import axios from './api/axios';
import TaskRow from './components/TaskRow';

export default function Home() {
  const [isAddNewTaskVisible, setIsAddNewTaskVisible] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const getTasks = async () => {
    try {
      const response = await axios.get('/api/tasks');
      setTasks(response.data.tasks);
    } catch (error) {
      console.log(error);
      if (!error?.response) setErrorMessage('No server response');
      else if (error.response?.status === 400)
        setErrorMessage(error.response.data?.message);
      else if (error.response?.status === 401)
        setErrorMessage(error.response.data?.message);
      else setErrorMessage('Failed to get tasks');
    }
  };

  useEffect(() => {
    getTasks();
  }, []);

  const openButton = (
    <button
      type="button"
      className="px-4 py-2 rounded-lg bg-opacity-40 bg-pink-900 text-pink-500 w-fit"
      onClick={() => setIsAddNewTaskVisible(true)}
    >
      + add task
    </button>
  );

  const closeButton = (
    <button
      type="button"
      className="px-4 py-2 rounded-lg bg-opacity-40 bg-pink-900 text-pink-500 w-fit"
      onClick={() => setIsAddNewTaskVisible(false)}
    >
      close
    </button>
  );

  return (
    <div className="flex flex-col justify-center gap-4 text-lg px-8">
      {errorMessage}
      {isAddNewTaskVisible ? closeButton : openButton}
      {isAddNewTaskVisible && <NewTask />}
      <button
        className="px-4 py-2 rounded-lg bg-opacity-50 bg-yellow-700 text-yellow-500 w-fit"
        onClick={() => getTasks()}
      >
        Refresh tasks
      </button>
      <table className="bg-gray-900  rounded-lg">
        <tr className="text-left h-16 border-b-2 border-solid border-gray-700 rounded-lg bg-gray-900">
          <th className="pl-6">Title</th>
          <th>Project</th>
          <th>Priority</th>
        </tr>
        {tasks.map((task) => (
          <TaskRow
            key={task._id}
            title={task.title}
            description={task.description}
            project={task.project}
            priority={task.priority}
            dueDate={task.dueDate}
          />
        ))}
      </table>
    </div>
  );
}
