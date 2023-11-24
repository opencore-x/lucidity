'use client';

import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../store/auth';
import Router from 'next/router';

export default function Signup() {
  const token = useAuthStore((state) => state.token);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [agreeToTerms, setAgreeToTerm] = useState(false);

  const router = Router();

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  return (
    <div className="px-8 text-lg justify-center">
      <p className="text-left text-xl font-semibold">Signup</p>

      <form
        className="flex flex-col mt-14 space-y-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <input
          placeholder="First Name"
          type="text"
          className="p-4 h-16 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setFirstName(e.target.value)}
        />
        <input
          placeholder="Last Name"
          type="text"
          className="p-4 h-16 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setLastName(e.target.value)}
        />
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
            className="p-4 h-16 bg-pink-900 w-20 rounded-lg"
            onClick={() => setIsPasswordVisible(!isPasswordVisible)}
          >
            Show
          </button>
        </div>
        <input
          placeholder="Confirm Password"
          type={isPasswordVisible ? 'text' : 'password'}
          className="p-4 h-16 rounded-lg bg-[#3B3B3B]"
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
        <div
          className="flex gap-3 items-center"
          onClick={() => setAgreeToTerm(!agreeToTerms)}
        >
          <input
            className=""
            type="checkbox"
            checked={agreeToTerms}
            onChange={() => setAgreeToTerm(!agreeToTerms)}
          />
          <label className="text-sm font-medium text-[#606060]">
            I agree to Terms of Service & Privacy Policy
          </label>
        </div>
        <button type="submit" className="p-4 h-16 bg-pink-900  rounded-lg">
          Create Account
        </button>
      </form>
    </div>
  );
}
