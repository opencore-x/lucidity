import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      _id: '',
      firstName: '',
      lastName: '',
      email: '',
      token: '',
      logIn: (user) =>
        set({
          _id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          token: user.token,
        }),
      logOut: () =>
        set({
          _id: '',
          firstName: '',
          lastName: '',
          email: '',
          token: '',
        }),
    }),
    { name: 'auth-store' },
  ),
);
