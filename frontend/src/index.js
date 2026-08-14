import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Set base URL with fallback
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// 🚀 AUTOMATIC TOKEN INJECTION
axios.interceptors.request.use(
  (config) => {
    // Retrieve the token from browser storage 
    // (Note: change 'token' if your local storage key has a different name like 'authToken' or 'user')
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);