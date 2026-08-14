import React from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { AuthProvider, useAuth } from './components/AuthProvider';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';

function Navbar() {
  const { user, logout } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
      <div className="container-fluid">
        <Link className="navbar-brand" to="/">SchoolMS</Link>
        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNav">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div id="mainNav" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-lg-0">
            {user && (
              <li className="nav-item">
                <Link className="nav-link" to="/">Dashboard</Link>
              </li>
            )}
            {!user && (
              <li className="nav-item">
                <Link className="nav-link" to="/login">Login</Link>
              </li>
            )}
            {!user && (
              <li className="nav-item">
                <Link className="nav-link" to="/register">Register</Link>
              </li>
            )}
            {user && (role === 'admin' || role === 'principal' || role === 'administrator') && (
              <li className="nav-item">
                <Link className="nav-link" to="/admin">Admin</Link>
              </li>
            )}
            {user && role === 'teacher' && (
              <li className="nav-item">
                <Link className="nav-link" to="/teacher">Teacher</Link>
              </li>
            )}
            {user && role === 'student' && (
              <li className="nav-item">
                <Link className="nav-link" to="/student">Student</Link>
              </li>
            )}
          </ul>
          {user && (
            <button className="btn btn-outline-light btn-sm" onClick={logout}>Logout</button>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar />
        <main className="container py-3">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/admin"
              element={<PrivateRoute allowedRoles={['admin', 'administrator', 'principal']}><AdminDashboard /></PrivateRoute>}
            />
            <Route
              path="/teacher"
              element={<PrivateRoute allowedRoles={['teacher']}><TeacherDashboard /></PrivateRoute>}
            />
            <Route
              path="/student"
              element={<PrivateRoute allowedRoles={['student']}><StudentDashboard /></PrivateRoute>}
            />
            <Route path="/" element={<PrivateRoute><Home /></PrivateRoute>} />
          </Routes>
        </main>
      </BrowserRouter>
    </AuthProvider>
  );
}
