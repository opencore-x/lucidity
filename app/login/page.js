'use client';

import React, { useState, useContext, useEffect } from 'react';
import axios from '../api/axios';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const router = useRouter();
  const token = useAuthStore((store) => store.token);
  const logIn = useAuthStore((store) => store.logIn);

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
    () =>
      isEmailValid && isPasswordValid
        ? setIsFormValid(true)
        : setIsFormValid(false),
    [isEmailValid, isPasswordValid],
  );

  useEffect(() => {
    if (token) router.push('/');
  }, [token]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // send request to the server
    if (isFormValid) {
      try {
        const response = await axios.post(
          '/api/auth',
          JSON.stringify({ email, password }),
          {
            headers: { 'Content-Type': 'application/json' },
            withCredentials: true,
          },
        );
        const user = response.data;
        logIn({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          token: user.token,
        });
      } catch (error) {
        console.log('entered catch');
        console.log(error.response?.data.message);
        if (!error?.response) setErrorMessage('No server response');
        else if (error.response?.status === 400)
          setErrorMessage(error.response.data.message);
        else if (error.response?.status === 401)
          setErrorMessage(error.response.data.message);
        else setErrorMessage('Login failed');
      }
    }
  };

  return (
    <div className="text-lg justify-center px-8">
      <p className="text-left text-xl font-semibold">Login</p>
      <p>{errorMessage ? errorMessage : ''}</p>
      <form
        className="flex flex-col mt-14 space-y-4"
        method="post"
        onSubmit={handleFormSubmit}
      >
        <input
          placeholder="Email Address"
          type="text"
          className="p-4 h-16 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="space-x-3 flex">
          <input
            placeholder="Password"
            type={isPasswordVisible ? 'text' : 'password'}
            className="p-4 h-16 w-full rounded-lg bg-[#3B3B3B]"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            className="bg-pink-900 w-20 px-4 rounded-lg"
            type="button"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            Show
          </button>
        </div>
        {isFormValid ? (
          <button className="h-16 bg-pink-900 rounded-lg">Login</button>
        ) : (
          <button
            className="h-16 bg-pink-900 rounded-lg opacity-40"
            type="submit"
            disabled
          >
            Login
          </button>
        )}
      </form>
    </div>
  );
}
