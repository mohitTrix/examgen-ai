import { createContext, useContext, useEffect, useState } from 'react';
import { api, tokenStore, errorMessage } from '../services/api.js';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!tokenStore.get());
  const [bootError, setBootError] = useState('');

  const restore = () => {
    if (!tokenStore.get()) return setLoading(false);
    setLoading(true);
    setBootError('');
    api.get('/auth/me')
      .then((r) => setUser(r.data.user))
      .catch((e) => e.response?.status !== 401 && setBootError(errorMessage(e)))
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    restore();
    const expired = () => setUser(null);
    window.addEventListener('auth:expired', expired);
    return () => window.removeEventListener('auth:expired', expired);
  }, []);

  const accept = ({ token, user }) => {
    tokenStore.set(token);
    setUser(user);
  };
  const value = {
    user, loading, bootError, restore, setUser, accept,
    login: async (body) => accept((await api.post('/auth/login', body)).data),
    signup: async (body) => accept((await api.post('/auth/signup', body)).data),
    logout: () => {
      tokenStore.clear();
      setUser(null);
    },
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
