'use client';

import React, { useState, useContext, useEffect } from 'react';
import Context from '../context/Context';
import axios from '../api/axios';
import { useRouter } from 'next/navigation';

export default function Page() {
  const { setAuth } = useContext(Context);
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [isEmailValid, setIsEmailValid] = useState(false);
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/g;

  const [password, setPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const passwordRegex = /^(?=.*\S).{3,}$/g;

  const [isFormValid, setIsFormValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState(false);

  useEffect(() => {
    setIsEmailValid(emailRegex.test(email));
    setIsPasswordValid(passwordRegex.test(password));
  }, [email, password]);

  useEffect(
    () => (isEmailValid && isPasswordValid ? setIsFormValid(true) : setIsFormValid(false)),
    [isEmailValid, isPasswordValid]
  );

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // send request to the server
    if (isFormValid) {
      try {
        const response = await axios.post('/api/auth', JSON.stringify({ email, password }), {
          headers: { 'Content-Type': 'application/json' },
          withCredentials: true,
        });
        setAuth(response.data);
        router.push('/task');
      } catch (error) {
        console.log(error.response.data.message);
        if (!error?.response) setErrorMessage('No server response');
        else if (error.response?.status === 400) setErrorMessage(error.response.data.message);
        else if (error.response?.status === 401) setErrorMessage(error.response.data.message);
        else setErrorMessage('Login failed');
      }
    }
  };

  return (
    <div className="flex h-screen justify-center ">
      <p>{errorMessage ? errorMessage : ''}</p>
      <form className="flex flex-col h-4 mt-20 w-80 space-y-4" onSubmit={handleFormSubmit}>
        <input
          placeholder="Email Address"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="space-x-3 flex">
          <input
            placeholder="Password"
            type={isPasswordVisible ? 'text' : 'password'}
            className="p-3 w-full rounded-lg bg-[#3B3B3B]"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="p-3 bg-pink-900 w-20 rounded-lg"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            Show
          </button>
        </div>
        {isFormValid ? (
          <button className="p-3 bg-pink-900 rounded-lg">Login</button>
        ) : (
          <button className="p-3 bg-pink-900 rounded-lg opacity-40" disabled>
            Login
          </button>
        )}
      </form>
    </div>
  );
}
