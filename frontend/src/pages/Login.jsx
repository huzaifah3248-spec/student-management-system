import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    try {
      const currentUser = await login({ identifier, password });
      const role = String(currentUser?.role || '').toLowerCase();
      if (role === 'admin' || role === 'principal' || role === 'administrator') navigate('/admin');
      else if (role === 'teacher') navigate('/teacher');
      else if (role === 'student') navigate('/student');
      else navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed.');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-sm-10 col-md-7 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="h4 mb-3">Login</h2>
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Username or Email</label>
                <input className="form-control" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button className="btn btn-primary w-100" type="submit">Sign In</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
