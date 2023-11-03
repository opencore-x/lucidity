import React from 'react';

export default function page() {
  return (
    <div className="flex h-screen justify-center ">
      <form className="flex flex-col h-4 mt-20 w-80 space-y-4">
        <input
          placeholder="First Name"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <input
          placeholder="Last Name"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <input
          placeholder="Email Address"
          type="text"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <div className="space-x-3 flex">
          <input
            placeholder="Password"
            className="p-3 w-full rounded-lg bg-[#3B3B3B]"
          />
          <button className="p-3 bg-pink-900 w-20 rounded-lg"> Show</button>
        </div>
        <input
          placeholder="Confirm Password"
          type="password"
          className="p-3 rounded-lg bg-[#3B3B3B]"
        />
        <div className="flex gap-4">
          <input type="checkbox" />
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
