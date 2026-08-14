import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './App';
import './index.css';

// Configure axios global base URL for backend API
axios.defaults.baseURL = 'http://localhost:5000';

const root = createRoot(document.getElementById('root'));
root.render(<App />);
