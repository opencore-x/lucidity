'use client';

import React, { useState } from 'react';

export default function Page() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col h-4 mt-20 w-80 space-y-4" onSubmit={(e) => e.preventDefault()}>
        <input placeholder="Email Address" type="text" className="p-3 rounded-lg bg-[#3B3B3B]" />
        <div className="space-x-3 flex">
          <input
            placeholder="Password"
            type={isPasswordVisible ? 'text' : 'password'}
            className="p-3 w-full rounded-lg bg-[#3B3B3B]"
          />
          <button
            className="p-3 bg-pink-900 w-20 rounded-lg"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            Show
          </button>
        </div>
        <button className="p-3 bg-pink-900 rounded-lg">Login</button>
      </form>
    </div>
  );
}
