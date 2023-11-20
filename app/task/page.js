'use client';
import React, { useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import { useAuthStore } from '../store/auth';
import Project from '../components/Project';
import 'react-datepicker/dist/react-datepicker.css';
import { useRouter } from 'next/navigation';
import axios from '../api/axios';

export default function Task() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [project, setProject] = useState('');
  const [priority, setPriority] = useState('');
  const [dueDate, setDueDate] = useState();

  const [isAddProjectVisible, setIsAddProjectVisible] = useState(false);
  const [isDescriptionVisible, setIsDescriptionVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);
  const [isFormValid, setIsFormValid] = useState(true);

  const router = useRouter();

  const token = useAuthStore((store) => store.token);
  const logOut = useAuthStore((store) => store.logOut);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token]);

  const saveTask = async () => {
    const data = {
      title,
      description,
      project,
      priority,
      dueDate,
    };
    const config = {
      headers: {
        authorization: 'Bearer ' + token,
        'Content-Type': 'application/json',
      },
    };

    try {
      const task = await axios.post('/api/tasks', data, config);
      console.log(task);
    } catch (error) {
      console.log(error.response.data.message);
      if (!error?.response) setErrorMessage('No server response');
      else if (error.response?.status === 400 || error.response?.status === 401)
        setErrorMessage(error.response.data.message);
      else setErrorMessage('Login failed');
    }
  };

  return (
    <div className="justify-center text-lg px-8">
      <p className="text-left text-xl font-semibold">Task</p>
      <p>{errorMessage}</p>
      <button
        onClick={() => {
          console.log('clicked');
          logOut();
        }}
      >
        Logout
      </button>
      <form
        className="flex flex-col w-full space-y-4 mt-14"
        onSubmit={(e) => {
          e.preventDefault();
          if (isFormValid) saveTask();
        }}
      >
        <input
          type="text"
          placeholder="Enter task"
          className="p-6 h-16 rounded-xl bg-[#3B3B3B]"
          onChange={(e) => setTitle(e.target.value)}
        />
        <div className="flex h-16 gap-3">
          <button
            className="w-20 bg-pink-900 rounded-xl font-semibold"
            onClick={() => setIsAddProjectVisible(!isAddProjectVisible)}
          >
            {isAddProjectVisible ? '-' : '+'}
          </button>
          <select
            name="Project"
            className="rounded-xl bg-[#3B3B3B] text-[#999] w-full"
            onChange={(e) => setProject(e.target.value)}
            defaultValue={'select project'}
          >
            <option value={'select project'} disabled>
              select project
            </option>
            <option value={'solsense'}>solsense</option>
            <option value={'to-do'}>to-do</option>
            <option value={'Haayi'}>Haayi</option>
          </select>
        </div>
        {isAddProjectVisible && (
          <div className="p-4 bg-black-900 border-2 border-gray-800 rounded-xl">
            <Project />
          </div>
        )}
        <div className="flex h-16 gap-3">
          <input
            placeholder="Priority"
            className="w-20 rounded-xl bg-[#3B3B3B] text-center"
            onChange={(e) => setPriority(e.target.value)}
            value={priority}
          />
          <button
            className="bg-pink-900 w-20 rounded-xl"
            onClick={() => setPriority(1)}
          >
            1
          </button>
          <button
            className="bg-pink-900 w-20 rounded-xl"
            onClick={() => setPriority(2)}
          >
            2
          </button>
          <button
            className="bg-pink-900 w-20 rounded-xl"
            onClick={() => setPriority(3)}
          >
            3
          </button>
        </div>
        <div>
          <p className="ml-2 mb-3 text-base text-gray-400">Due Date</p>
          <div className="flex gap-3">
            <button
              className="px-3 bg-pink-900 h-14 rounded-xl"
              onClick={() => setDueDate(new Date())}
            >
              Today
            </button>
            <button
              className="px-3 bg-pink-900 h-14 rounded-xl"
              onClick={() =>
                setDueDate(new Date(new Date().getTime() + 24 * 60 * 60 * 1000))
              }
            >
              Tomorrow
            </button>
            <DatePicker
              className="h-14 w-full text-center bg-[#3B3B3B] rounded-xl"
              selected={dueDate}
              onChange={(date) => setDueDate(date)}
              dateFormat="dd-MM-yy"
              minDate={new Date()}
            />
          </div>
        </div>
        {!isDescriptionVisible && (
          <button
            className="text-gray-400 text-left"
            onClick={() => setIsDescriptionVisible(true)}
          >
            + add a description for this task
          </button>
        )}
        {isDescriptionVisible && (
          <textarea
            className="p-4 h-32 rounded-xl bg-[#3B3B3B]"
            placeholder="Description"
            onChange={(e) => setDescription(e.target.value)}
          />
        )}
        <button className="h-16 bg-pink-900 rounded-xl">add task</button>
      </form>
    </div>
  );
}
