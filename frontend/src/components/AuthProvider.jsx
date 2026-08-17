import React, { createContext, useState, useContext } from 'react';
import axios from 'axios';

// 1. Global Axios Interceptor (Runs instantly, outside React's render cycle)
axios.interceptors.request.use(
  (config) => {
    // Notice we are using your exact custom key: 'sms_token'
    const token = localStorage.getItem('sms_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 2. Lazy initialization survives page refreshes perfectly
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('sms_user'));
    } catch (error) {
      return null;
    }
  });
  
  const [token, setToken] = useState(() => localStorage.getItem('sms_token'));

  // 3. The buggy useEffect has been completely removed from here.

  const login = async ({ identifier, password }) => {
    const res = await axios.post('/api/login', { identifier, password });
    const { token: receivedToken, user: receivedUser } = res.data;
    
    setToken(receivedToken);
    setUser(receivedUser);
    localStorage.setItem('sms_token', receivedToken);
    localStorage.setItem('sms_user', JSON.stringify(receivedUser));
    
    return receivedUser;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('sms_token');
    localStorage.removeItem('sms_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}