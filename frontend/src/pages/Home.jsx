import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Home() {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (role === 'admin' || role === 'principal' || role === 'administrator') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'teacher') {
    return <Navigate to="/teacher" replace />;
  }
  if (role === 'student') {
    return <Navigate to="/student" replace />;
  }

  return (
    <div className="card shadow-sm">
      <div className="card-body">
        <h2 className="h4">Dashboard</h2>
        <p className="mb-0">No role-specific dashboard is configured for this user.</p>
      </div>
    </div>
  );
}
