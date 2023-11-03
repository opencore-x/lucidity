'use client';

import React, { useState } from 'react';

export default function Page() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [agreeToTerms, setAgreeToTerm] = useState(false);

  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col h-4 mt-20 w-80 space-y-4" onSubmit={(e) => e.preventDefault()}>
        {/* {firstName} */}
        <input
          placeholder="First Name"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setFirstName(e.target.value)}
        />
        {/* {lastName} */}
        <input
          placeholder="Last Name"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setLastName(e.target.value)}
        />
        {/* {email} */}
        <input
          placeholder="Email Address"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setEmail(e.target.value)}
        />
        {/* {password} */}
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
        {/* {confirmPassword} */}
        <input
          placeholder="Confirm Password"
          type={isPasswordVisible ? 'text' : 'password'}
          className="p-3 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <div className="flex gap-4" onClick={() => setAgreeToTerm(!agreeToTerms)}>
          <input type="checkbox" checked={agreeToTerms} />
          <label className="text-xs font-semibold text-[#606060]">
            I agree to Terms of service and Privacy Policy
          </label>
        </div>
        <button type="submit" className="p-3 bg-pink-900  rounded-lg">
          Sign Up
        </button>
      </form>
    </div>
  );
}
