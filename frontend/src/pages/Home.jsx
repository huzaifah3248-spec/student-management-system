import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Home() {
  const { user } = useAuth();
  const role = String(user?.role || '').toUpperCase(); // Synchronized uppercase

  if (role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }
  if (role === 'TEACHER') {
    return <Navigate to="/teacher" replace />;
  }
  if (role === 'STUDENT') {
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