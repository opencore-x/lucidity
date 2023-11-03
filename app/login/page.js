'use client';

import React, { useState } from 'react';

export default function Page() {
  const [email, setemail] = useState('');
  const [password, setpassword] = useState('');
  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col h-4 mt-20 w-80 space-y-4">
        <input
          placeholder="Email Address"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <div className="space-x-3 flex">
          <input
            placeholder="Password"
            type="password"
            className="p-3 w-full rounded-lg bg-[#3B3B3B]"
          />
          <button className="p-3 bg-pink-900 w-20 rounded-lg">Show</button>
        </div>
        <button type="submit" className="p-3 bg-pink-900  rounded-lg">
          Login
        </button>
      </form>
    </div>
  );
}
