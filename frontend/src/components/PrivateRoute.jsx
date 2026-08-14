import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  if (allowedRoles && Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    const role = (user?.role || '').toLowerCase();
    const allowed = allowedRoles.map((r) => String(r).toLowerCase());
    if (!allowed.includes(role)) {
      // Not authorized for this route
      return <Navigate to="/" replace />;
    }
  } else if (allowedRoles && !Array.isArray(allowedRoles)) {
    const role = (user?.role || '').toLowerCase();
    if (String(allowedRoles).toLowerCase() !== role) return <Navigate to="/" replace />;
  }

  return children;
}
