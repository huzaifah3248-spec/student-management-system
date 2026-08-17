import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export default function PrivateRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;

  const userRole = String(user?.role || '').toUpperCase();

  if (allowedRoles) {
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    const allowed = rolesArray.map((r) => String(r).toUpperCase());

    if (!allowed.includes(userRole)) {
      // Not authorized for this route, redirect home
      return <Navigate to="/" replace />;
    }
  }

  return children;
}