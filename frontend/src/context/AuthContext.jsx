import { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('insight_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const res = await api.login({ email, password });
    localStorage.setItem('insight_token', res.access_token);
    localStorage.setItem('insight_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const signup = async (data) => {
    const res = await api.signup(data);
    localStorage.setItem('insight_token', res.access_token);
    localStorage.setItem('insight_user', JSON.stringify(res.user));
    setUser(res.user);
    return res.user;
  };

  const logout = () => {
    localStorage.removeItem('insight_token');
    localStorage.removeItem('insight_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
