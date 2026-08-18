import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'STUDENT' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const submit = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');
    try {
      const res = await axios.post('/api/register', form);
      setMessage(res.data?.message || 'User created.');
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    }
  };

  return (
    <div className="row justify-content-center">
      <div className="col-12 col-sm-10 col-md-7 col-lg-5">
        <div className="card shadow-sm">
          <div className="card-body">
            <h2 className="h4 mb-3">Register</h2>
            <form onSubmit={submit}>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input className="form-control" value={form.username} onChange={(e) => setForm((s) => ({ ...s, username: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input className="form-control" type="email" value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input className="form-control" type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} required />
              </div>
              <div className="mb-3">
                <label className="form-label">Role</label>
                <select className="form-select" value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}>
                  <option value="STUDENT">STUDENT</option>
                  <option value="TEACHER">TEACHER</option>
                  <option value="ADMIN">PRINCIPAL</option>
                </select>
              </div>
              {message && <div className="alert alert-success py-2">{message}</div>}
              {error && <div className="alert alert-danger py-2">{error}</div>}
              <button className="btn btn-primary w-100" type="submit">Create Account</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
