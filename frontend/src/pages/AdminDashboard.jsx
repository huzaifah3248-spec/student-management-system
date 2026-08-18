import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';

const initialUserForm = { username: '', email: '', password: '', role: 'STUDENT' };
const initialStudentForm = {
  student_id: '',
  user_id: '',
  first_name: '',
  last_name: '',
  date_of_birth: '',
  grade_level: '1',
  section_no: '1',
  class_roll_no: '1',
  elective_track: '',
  elective_subject: ''
};

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [userForm, setUserForm] = useState(initialUserForm);
  const [studentForm, setStudentForm] = useState(initialStudentForm);
  const [assignmentForm, setAssignmentForm] = useState({ teacher_user_id: '', subject_id: '' });
  const [overrideForm, setOverrideForm] = useState({ student_id: '', track: 'SCIENCE', subject: 'BIOLOGY' });
  const [promoteForm, setPromoteForm] = useState({ student_id: '', section_no: '', class_roll_no: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [editingUserId, setEditingUserId] = useState(null);
  const [editForm, setEditForm] = useState({ username: '', email: '', role: 'STUDENT', is_active: 1 });
  const clearNotice = () => { setError(''); setMessage(''); };

  const handleStartEdit = (user) => {
    setEditingUserId(user.id);
    setEditForm({
      username: user.username,
      email: user.email,
      role: user.role,
      is_active: user.is_active
    });
  };
const handleUpdateUser = async (event, userId) => {
    event.preventDefault();
    clearNotice();
    try {
      await axios.put(`/api/admin/users/${userId}`, editForm);
      setMessage('User updated successfully.');
      setEditingUserId(null); // Close the edit mode
      await loadData(); // Refresh table data
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user.');
    }
  };


  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditForm({ username: '', email: '', role: 'STUDENT', is_active: 1 });
  };

  const loadData = useCallback(async () => {
    try {
      const [userRes, assignmentRes, subjectRes, classroomRes, studentRes] = await Promise.all([
        axios.get('/api/admin/users'),
        axios.get('/api/admin/teacher-subjects'),
        axios.get('/api/admin/subjects'),
        axios.get('/api/classrooms'),
        axios.get('/api/students')
      ]);
      const currentUsers = userRes.data?.users || [];
      setUsers(currentUsers);
      setAssignments(assignmentRes.data?.assignments || []);
      setTeachers(currentUsers.filter((u) => String(u.role).toUpperCase() === 'TEACHER'));
      setSubjects(subjectRes.data?.subjects || []);
      setClassrooms(classroomRes.data?.classrooms || []);
      setStudents(studentRes.data?.students || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load admin data.');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const createUser = async (event) => {
    event.preventDefault();
    clearNotice();
    try {
      await axios.post('/api/admin/users', userForm);
      setMessage('User created successfully.');
      setUserForm(initialUserForm);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user.');
    }
  };

  const createStudent = async (event) => {
    event.preventDefault();
    clearNotice();
    try {
      const payload = {
        ...studentForm,
        user_id: Number(studentForm.user_id),
        grade_level: Number(studentForm.grade_level),
        section_no: Number(studentForm.section_no),
        class_roll_no: Number(studentForm.class_roll_no),
        elective_track: studentForm.elective_track || null,
        elective_subject: studentForm.elective_subject || null
      };
      await axios.post('/api/students', payload);
      setMessage('Student created with automatic curriculum enrollment.');
      setStudentForm(initialStudentForm);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create student.');
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Are you sure you want to delete this user?")) return;
    clearNotice();
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setMessage('User deleted successfully.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user.');
    }
  };

  const assignTeacherSubject = async (event) => {
    event.preventDefault();
    clearNotice();
    try {
      await axios.post('/api/admin/teacher-subjects', {
        teacher_user_id: Number(assignmentForm.teacher_user_id),
        subject_id: Number(assignmentForm.subject_id)
      });
      setMessage('Teacher subject assignment saved.');
      setAssignmentForm({ teacher_user_id: '', subject_id: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to assign subject.');
    }
  };

  const overrideGrade10 = async (event) => {
    event.preventDefault();
    clearNotice();
    try {
      await axios.post('/api/admin/override-grade10', {
        student_id: Number(overrideForm.student_id),
        track: overrideForm.track,
        subject: overrideForm.track === 'ARTS' ? null : overrideForm.subject
      });
      setMessage('Grade 10 elective override applied and logged.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to override elective.');
    }
  };

  const promoteStudent = async (event) => {
    event.preventDefault();
    clearNotice();
    try {
      const payload = { student_id: Number(promoteForm.student_id) };
      if (promoteForm.section_no) payload.section_no = Number(promoteForm.section_no);
      if (promoteForm.class_roll_no) payload.class_roll_no = Number(promoteForm.class_roll_no);
      await axios.put(`/api/students/${promoteForm.student_id}/promote`, payload);
      setMessage('Student promoted successfully.');
      setPromoteForm({ student_id: '', section_no: '', class_roll_no: '' });
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote student.');
    }
  };

  const totalStudents = students.length;
  const totalClassrooms = classrooms.length;
  const totalTeachers = teachers.length;
  const totalSubjects = subjects.length;
  const totalCapacity = classrooms.reduce((sum, c) => sum + c.capacity, 0);
  const totalEnrolled = classrooms.reduce((sum, c) => sum + c.enrolled, 0);

  return (
    <div>
      <div className="dashboard-header">
        <h2>Principal Dashboard</h2>
        <p>Manage users, students, classrooms, and academic records.</p>
      </div>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-tabs mb-4">
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'users', label: 'Users' },
          { key: 'students', label: 'Students' },
          { key: 'classrooms', label: 'Classrooms' },
          { key: 'assignments', label: 'Assignments' },
          { key: 'tools', label: 'Tools' }
        ].map(tab => (
          <li key={tab.key} className="nav-item">
            <button className={`nav-link ${activeTab === tab.key ? 'active' : ''}`} onClick={() => setActiveTab(tab.key)}>
              {tab.label}
            </button>
          </li>
        ))}
      </ul>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card shadow-sm stat-card">
              <div className="stat-value text-primary">{totalStudents}</div>
              <div className="stat-label">Students</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm stat-card">
              <div className="stat-value text-success">{totalTeachers}</div>
              <div className="stat-label">Teachers</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm stat-card">
              <div className="stat-value text-info">{totalClassrooms}</div>
              <div className="stat-label">Classrooms</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card shadow-sm stat-card">
              <div className="stat-value text-warning">{totalSubjects}</div>
              <div className="stat-label">Subjects</div>
            </div>
          </div>
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">Capacity Overview</div>
              <div className="card-body">
                <p className="mb-2">
                  <strong>{totalEnrolled}</strong> / <strong>{totalCapacity}</strong> seats filled across all classrooms
                  ({totalCapacity > 0 ? ((totalEnrolled / totalCapacity) * 100).toFixed(1) : 0}%)
                </p>
                <div className="capacity-bar mb-3">
                  <div
                    className="capacity-fill bg-primary"
                    style={{ width: `${totalCapacity > 0 ? (totalEnrolled / totalCapacity) * 100 : 0}%` }}
                  />
                </div>
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Grade</th>
                        <th>Section</th>
                        <th>Enrolled</th>
                        <th>Capacity</th>
                        <th>Fill Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classrooms.slice(0, 20).map((c) => {
                        const pct = c.capacity > 0 ? ((c.enrolled / c.capacity) * 100).toFixed(0) : 0;
                        return (
                          <tr key={c.id}>
                            <td><span className="badge bg-primary badge-grade">Grade {c.grade_level}</span></td>
                            <td>Section {c.section_no}</td>
                            <td><strong>{c.enrolled}</strong></td>
                            <td>{c.capacity}</td>
                            <td>
                              <div className="d-flex align-items-center gap-2">
                                <div className="capacity-bar flex-grow-1">
                                  <div
                                    className={`capacity-fill ${Number(pct) >= 90 ? 'bg-danger' : Number(pct) >= 70 ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <small className="text-muted" style={{ minWidth: '40px' }}>{pct}%</small>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="row g-3">
          <div className="col-xl-5">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-success text-white">Create User</div>
              <div className="card-body">
                <form onSubmit={createUser}>
                  <div className="mb-2">
                    <label className="form-label">Username</label>
                    <input className="form-control" value={userForm.username} onChange={(e) => setUserForm((s) => ({ ...s, username: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Email</label>
                    <input className="form-control" type="email" value={userForm.email} onChange={(e) => setUserForm((s) => ({ ...s, email: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">Password</label>
                    <input className="form-control" type="password" value={userForm.password} onChange={(e) => setUserForm((s) => ({ ...s, password: e.target.value }))} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Role</label>
                    <select className="form-select" value={userForm.role} onChange={(e) => setUserForm((s) => ({ ...s, role: e.target.value }))}>
                      <option value="STUDENT">STUDENT</option>
                      <option value="TEACHER">TEACHER</option>
                    <option value="ADMIN">PRINCIPAL</option>
                    </select>
                  </div>
                  <button className="btn btn-primary w-100">Create User</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-xl-7">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">All Users ({users.length})</div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr><th>ID</th><th>Username</th><th>Email</th><th>Role</th><th>Active</th><th>Actions</th></tr>
                    </thead>
                   <tbody>
                                        {users.map((u) => {
                      const isEditing = editingUserId === u.id;
                      return (
                        <tr key={u.id}>
                          <td>{u.id}</td>
                          <td>
                            {isEditing ? (
                              <input 
                                className="form-control form-control-sm" 
                                value={editForm.username} 
                                onChange={(e) => setEditForm(s => ({ ...s, username: e.target.value }))} 
                                required 
                              />
                            ) : (
                              <strong>{u.username}</strong>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <input 
                                className="form-control form-control-sm" 
                                type="email" 
                                value={editForm.email} 
                                onChange={(e) => setEditForm(s => ({ ...s, email: e.target.value }))} 
                                required 
                              />
                            ) : (
                              u.email
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select 
                                className="form-select form-select-sm" 
                                value={editForm.role} 
                                onChange={(e) => setEditForm(s => ({ ...s, role: e.target.value }))}
                              >
                                <option value="STUDENT">STUDENT</option>
                                <option value="TEACHER">TEACHER</option>
                                <option value="ADMIN">PRINCIPAL</option>
                              </select>
                            ) : (
                              <span className={`badge ${String(u.role).toUpperCase() === 'ADMIN' ? 'bg-danger' : String(u.role).toUpperCase() === 'TEACHER' ? 'bg-info text-dark' : 'bg-secondary'}`}>
                                {u.role}
                              </span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <select 
                                className="form-select form-select-sm" 
                                value={editForm.is_active} 
                                onChange={(e) => setEditForm(s => ({ ...s, is_active: Number(e.target.value) }))}
                              >
                                <option value={1}>Active</option>
                                <option value={0}>Inactive</option>
                              </select>
                            ) : (
                              u.is_active ? <span className="badge bg-success">Active</span> : <span className="badge bg-secondary">Inactive</span>
                            )}
                          </td>
                          <td>
                            {isEditing ? (
                              <div className="d-flex gap-1">
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-success" 
                                  onClick={(e) => handleUpdateUser(e, u.id)}
                                >
                                  Save
                                </button>
                                <button 
                                  type="button" 
                                  className="btn btn-sm btn-secondary" 
                                  onClick={handleCancelEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <div className="d-flex gap-1">
                                <button 
                                  className="btn btn-sm btn-primary" 
                                  onClick={() => handleStartEdit(u)}
                                >
                                  Edit
                                </button>
                                <button 
                                  className="btn btn-sm btn-danger" 
                                  onClick={() => handleDeleteUser(u.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>    
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STUDENTS TAB */}
      {activeTab === 'students' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            Student Management ({students.length} students)
          </div>
          <div className="card-body">
            <h5 className="mb-3">Create New Student</h5>
            <form onSubmit={createStudent} className="row g-2 mb-4">
              <div className="col-md-4">
                <label className="form-label">Student ID</label>
                <input className="form-control form-control-sm" placeholder="e.g., STU-1021" value={studentForm.student_id} onChange={(e) => setStudentForm((s) => ({ ...s, student_id: e.target.value }))} required />
              </div>
              <div className="col-md-4">
                <label className="form-label">User ID (link to account)</label>
                <input className="form-control form-control-sm" type="number" placeholder="From Users table" value={studentForm.user_id} onChange={(e) => setStudentForm((s) => ({ ...s, user_id: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">First Name</label>
                <input className="form-control form-control-sm" value={studentForm.first_name} onChange={(e) => setStudentForm((s) => ({ ...s, first_name: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Last Name</label>
                <input className="form-control form-control-sm" value={studentForm.last_name} onChange={(e) => setStudentForm((s) => ({ ...s, last_name: e.target.value }))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label">Date of Birth</label>
                <input className="form-control form-control-sm" type="date" value={studentForm.date_of_birth} onChange={(e) => setStudentForm((s) => ({ ...s, date_of_birth: e.target.value }))} />
              </div>
              <div className="col-md-2">
                <label className="form-label">Grade</label>
                <select className="form-select form-select-sm" value={studentForm.grade_level} onChange={(e) => setStudentForm((s) => ({ ...s, grade_level: e.target.value }))} required>
                  {[1,2,3,4,5,6,7,8,9,10].map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Section</label>
                <select className="form-select form-select-sm" value={studentForm.section_no} onChange={(e) => setStudentForm((s) => ({ ...s, section_no: e.target.value }))} required>
                  {[1,2,3,4,5].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label">Roll #</label>
                <input className="form-control form-control-sm" type="number" min="1" max="35" value={studentForm.class_roll_no} onChange={(e) => setStudentForm((s) => ({ ...s, class_roll_no: e.target.value }))} required />
              </div>
              <div className="col-md-3">
                <label className="form-label">Elective Track</label>
                <select className="form-select form-select-sm" value={studentForm.elective_track} onChange={(e) => setStudentForm((s) => ({ ...s, elective_track: e.target.value }))}>
                  <option value="">None (Grades 1-8)</option>
                  <option value="SCIENCE">SCIENCE</option>
                  <option value="ARTS">ARTS</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label">Elective Subject</label>
                <select className="form-select form-select-sm" value={studentForm.elective_subject} onChange={(e) => setStudentForm((s) => ({ ...s, elective_subject: e.target.value }))} disabled={!studentForm.elective_track || studentForm.elective_track === 'ARTS'}>
                  <option value="">None</option>
                  <option value="BIOLOGY">BIOLOGY</option>
                  <option value="COMPUTER_SCIENCE">COMPUTER_SCIENCE</option>
                </select>
              </div>
              <div className="col-md-2 d-flex align-items-end">
                <button className="btn btn-primary btn-sm w-100">Create Student</button>
              </div>
            </form>

            <h5 className="mb-3">All Students</h5>
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Student ID</th>
                    <th>Name</th>
                    <th>Grade</th>
                    <th>Sec</th>
                    <th>Roll</th>
                    <th>Track</th>
                    <th>Elective</th>
                    <th>Locked</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td><code>{s.student_id}</code></td>
                      <td>{s.first_name} {s.last_name}</td>
                      <td><span className="badge bg-primary badge-grade">G{s.grade_level}</span></td>
                      <td>{s.section_no}</td>
                      <td>#{s.class_roll_no}</td>
                      <td>{s.elective_track ? <span className="badge bg-info text-dark">{s.elective_track}</span> : <span className="text-muted">--</span>}</td>
                      <td>{s.elective_subject || <span className="text-muted">--</span>}</td>
                      <td>{s.elective_locked ? <span className="badge bg-danger">Yes</span> : <span className="badge bg-success">No</span>}</td>
                    </tr>
                  ))}
                  {students.length === 0 && <tr><td colSpan="9" className="text-muted text-center">No students enrolled yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CLASSROOMS TAB */}
      {activeTab === 'classrooms' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">Classrooms ({classrooms.length})</div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-sm table-striped align-middle mb-0">
                <thead>
                  <tr><th>ID</th><th>Grade</th><th>Section</th><th>Enrolled</th><th>Capacity</th><th>Fill Rate</th><th>Available</th></tr>
                </thead>
                <tbody>
                  {classrooms.map((c) => {
                    const pct = c.capacity > 0 ? ((c.enrolled / c.capacity) * 100).toFixed(0) : 0;
                    return (
                      <tr key={c.id}>
                        <td>{c.id}</td>
                        <td><span className="badge bg-primary badge-grade">Grade {c.grade_level}</span></td>
                        <td>Section {c.section_no}</td>
                        <td><strong>{c.enrolled}</strong></td>
                        <td>{c.capacity}</td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div className="capacity-bar flex-grow-1" style={{ minWidth: '60px' }}>
                              <div className={`capacity-fill ${Number(pct) >= 90 ? 'bg-danger' : Number(pct) >= 70 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${pct}%` }} />
                            </div>
                            <small>{pct}%</small>
                          </div>
                        </td>
                        <td><strong>{c.capacity - c.enrolled}</strong> seats left</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGNMENTS TAB */}
      {activeTab === 'assignments' && (
        <div className="row g-3">
          <div className="col-xl-5">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-success text-white">Assign Teacher to Subject</div>
              <div className="card-body">
                <form onSubmit={assignTeacherSubject}>
                  <div className="mb-3">
                    <label className="form-label">Teacher</label>
                    <select className="form-select" value={assignmentForm.teacher_user_id} onChange={(e) => setAssignmentForm((s) => ({ ...s, teacher_user_id: e.target.value }))} required>
                      <option value="">Select teacher</option>
                      {teachers.map((t) => (
                        <option key={t.id} value={t.id}>{t.username} ({t.email})</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Subject</label>
                    <select className="form-select" value={assignmentForm.subject_id} onChange={(e) => setAssignmentForm((s) => ({ ...s, subject_id: e.target.value }))} required>
                      <option value="">Select subject</option>
                      {subjects.map((subj) => (
                        <option key={subj.id} value={subj.id}>
                          {subj.subject_code} - {subj.subject_name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary w-100">Assign</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-xl-7">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">Teacher-Subject Assignments ({assignments.length})</div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm table-striped align-middle mb-0">
                    <thead>
                      <tr><th>#</th><th>Teacher</th><th>Email</th><th>Subject Code</th><th>Subject Name</th></tr>
                    </thead>
                    <tbody>
                      {assignments.map((a, i) => (
                        <tr key={a.id}>
                          <td>{i + 1}</td>
                          <td><strong>{a.teacher_username}</strong></td>
                          <td>{a.teacher_email}</td>
                          <td><code>{a.subject_code}</code></td>
                          <td>{a.subject_name}</td>
                        </tr>
                      ))}
                      {assignments.length === 0 && <tr><td colSpan="5" className="text-muted text-center">No assignments yet.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TOOLS TAB */}
      {activeTab === 'tools' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-warning text-dark">Promote Student</div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Promotes a student to the next grade level. Capacity is checked automatically.
                  Grade 9 electives carry over to Grade 10 (and get locked).
                </p>
                <form onSubmit={promoteStudent}>
                  <div className="mb-2">
                    <label className="form-label">Student Table ID</label>
                    <input className="form-control form-control-sm" type="number" placeholder="students.id" value={promoteForm.student_id} onChange={(e) => setPromoteForm((s) => ({ ...s, student_id: e.target.value }))} required />
                  </div>
                  <div className="row g-2 mb-3">
                    <div className="col-6">
                      <label className="form-label">New Section (optional)</label>
                      <select className="form-select form-select-sm" value={promoteForm.section_no} onChange={(e) => setPromoteForm((s) => ({ ...s, section_no: e.target.value }))}>
                        <option value="">Keep current</option>
                        {[1,2,3,4,5].map(s => <option key={s} value={s}>Section {s}</option>)}
                      </select>
                    </div>
                    <div className="col-6">
                      <label className="form-label">New Roll # (optional)</label>
                      <input className="form-control form-control-sm" type="number" min="1" max="35" placeholder="Keep current" value={promoteForm.class_roll_no} onChange={(e) => setPromoteForm((s) => ({ ...s, class_roll_no: e.target.value }))} />
                    </div>
                  </div>
                  <button className="btn btn-warning w-100">Promote Student</button>
                </form>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-danger text-white">Grade 10 Elective Override</div>
              <div className="card-body">
                <p className="text-muted small mb-3">
                  Override a Grade 10 student's locked elective selection.
                  This action is logged in the admin_actions table for audit.
                </p>
                <form onSubmit={overrideGrade10}>
                  <div className="mb-2">
                    <label className="form-label">Student Table ID</label>
                    <input className="form-control form-control-sm" type="number" placeholder="students.id" value={overrideForm.student_id} onChange={(e) => setOverrideForm((s) => ({ ...s, student_id: e.target.value }))} required />
                  </div>
                  <div className="mb-2">
                    <label className="form-label">New Track</label>
                    <select className="form-select form-select-sm" value={overrideForm.track} onChange={(e) => setOverrideForm((s) => ({ ...s, track: e.target.value }))}>
                      <option value="SCIENCE">SCIENCE</option>
                      <option value="ARTS">ARTS</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">New Elective Subject</label>
                    <select className="form-select form-select-sm" value={overrideForm.subject} onChange={(e) => setOverrideForm((s) => ({ ...s, subject: e.target.value }))} disabled={overrideForm.track === 'ARTS'}>
                      <option value="BIOLOGY">BIOLOGY</option>
                      <option value="COMPUTER_SCIENCE">COMPUTER_SCIENCE</option>
                    </select>
                  </div>
                  <button className="btn btn-danger w-100">Apply Override</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
