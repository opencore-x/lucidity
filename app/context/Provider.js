import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Context from './Context';

export default function Provider({ children }) {
  const router = useRouter();

  const token = localStorage.getItem('token');
  const expiresAt = localStorage.getItem('expiresAt');
  const user = localStorage.getItem('user');

  const [auth, setAuth] = useState({
    token,
    expiresAt,
    user: user ? JSON.parse(user) : {},
  });

  const isAuthenticated = () => {
    if (!auth.token || !auth.expiresAt) return false;
    return new Date().getSeconds() < auth.expiresAt();
  };

  useEffect(() => {
    if (!isAuthenticated()) router.push('/login');
  }, [auth]);

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('expiresAt');
    localStorage.removeItem('user');

    setAuth({ token: null, expiresAt: null, user: {} });
  };

  const login = ({ token, expiresAt, user }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('expiresAt', expiresAt);
    localStorage.setItem('user', JSON.stringify(user));

    setAuth({ token, expiresAt, user });
  };

  return (
    <Context.Provider value={{ auth, setAuth: (authInfo) => login(authInfo), logout, isAuthenticated }}>
      {children}
    </Context.Provider>
  );
}
