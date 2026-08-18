import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';


// AUTOMATIC TOKEN INJECTION
axios.interceptors.request.use(
  (config) => {
    // 1. Grab the token directly from local storage right before the request leaves
    const token = localStorage.getItem('token');
    
    // 2. If a token exists, staple it to the Authorization header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
// Set base URL with fallback
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

//  AUTOMATIC TOKEN INJECTION
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

const root = createRoot(document.getElementById('root'));
root.render(<App />);