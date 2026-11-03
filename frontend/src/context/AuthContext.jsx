import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/endpoints';
import { TOKEN_KEY } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initialising, setInitialising] = useState(() => Boolean(localStorage.getItem(TOKEN_KEY)));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setUser(null);
  }, []);

  // Restore the session from a stored token on first load.
  useEffect(() => {
    if (!localStorage.getItem(TOKEN_KEY)) return;
    authApi
      .me()
      .then((res) => setUser(res.data))
      .catch(() => logout())
      .finally(() => setInitialising(false));
  }, [logout]);

  // The API client fires this when a request comes back 401.
  useEffect(() => {
    window.addEventListener('nexachain:unauthorized', logout);
    return () => window.removeEventListener('nexachain:unauthorized', logout);
  }, [logout]);

  const applySession = ({ token, user: nextUser }) => {
    localStorage.setItem(TOKEN_KEY, token);
    setUser(nextUser);
  };

  const login = async (payload) => applySession((await authApi.login(payload)).data);
  const register = async (payload) => applySession((await authApi.register(payload)).data);
  const refreshUser = async () => setUser((await authApi.me()).data);

  const value = useMemo(
    () => ({ user, initialising, isAuthenticated: Boolean(user), login, register, logout, refreshUser }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, initialising, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
