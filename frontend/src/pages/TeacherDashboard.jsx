import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { useAuth } from '../components/AuthProvider';

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState([]);
  const [gradebook, setGradebook] = useState([]);
  const [students, setStudents] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const loadSubjects = useCallback(async () => {
    try {
      const res = await axios.get('/api/teacher/subjects');
      setSubjects(res.data.subjects || []);
      return res.data.subjects || [];
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load assigned subjects.');
      return [];
    }
  }, []);

  const loadStudents = useCallback(async () => {
    try {
      const res = await axios.get('/api/teacher/students');
      setStudents(res.data.students || []);
    } catch (err) {
      // silently fail — students list is supplementary
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const subs = await loadSubjects();
        await loadStudents();
        if (!mounted) return;
        if (subs.length > 0) {
          setSelectedSubject(String(subs[0].subject_id));
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [loadSubjects, loadStudents]);

  useEffect(() => {
    if (!selectedSubject) return;
    let mounted = true;
    (async () => {
      try {
        const res = await axios.get(`/api/teacher/gradebook?subject_id=${selectedSubject}`);
        if (mounted) setGradebook(res.data.gradebook || []);
      } catch (err) {
        if (mounted) setError(err.response?.data?.message || 'Failed to load gradebook.');
      }
    })();
    return () => { mounted = false; };
  }, [selectedSubject]);

  const submitMarks = async (enrollmentId, marksObtained, maxMarks) => {
    setMessage('');
    setError('');
    try {
      await axios.post('/api/marks', {
        enrollment_id: enrollmentId,
        marks_obtained: Number(marksObtained),
        max_marks: Number(maxMarks)
      });
      setMessage('Marks saved successfully.');

      // Refresh gradebook
      const res = await axios.get(`/api/teacher/gradebook?subject_id=${selectedSubject}`);
      setGradebook(res.data.gradebook || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save marks.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2 text-muted">Loading your dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>Teacher Dashboard</h2>
        <p>Welcome, {user?.username}. Manage your subjects and enter student marks.</p>
      </div>

      {message && <div className="alert alert-success py-2">{message}</div>}
      {error && <div className="alert alert-danger py-2">{error}</div>}

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            Overview
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'gradebook' ? 'active' : ''}`} onClick={() => setActiveTab('gradebook')}>
            Gradebook &amp; Marks
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'students' ? 'active' : ''}`} onClick={() => setActiveTab('students')}>
            Students
          </button>
        </li>
      </ul>

      {activeTab === 'overview' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">Assigned Subjects</div>
              <div className="card-body">
                {subjects.length > 0 ? (
                  <div className="list-group">
                    {subjects.map((s) => (
                      <div key={s.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{s.subject_name}</strong>
                          <br /><small className="text-muted">{s.subject_code} &middot; Track: {s.track}</small>
                        </div>
                        <span className="badge bg-primary">{s.track}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted mb-0">No subjects assigned yet. Contact the administrator.</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-success text-white">Quick Stats</div>
              <div className="card-body">
                <div className="row text-center g-3">
                  <div className="col-6 stat-card">
                    <div className="stat-value text-primary">{subjects.length}</div>
                    <div className="stat-label">Subjects</div>
                  </div>
                  <div className="col-6 stat-card">
                    <div className="stat-value text-success">{gradebook.length}</div>
                    <div className="stat-label">Enrollments</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gradebook' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">
            Gradebook &amp; Marks Entry
          </div>
          <div className="card-body">
            {subjects.length > 0 ? (
              <>
                <div className="mb-3">
                  <label className="form-label">Select Subject</label>
                  <select
                    className="form-select"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    {subjects.map((s) => (
                      <option key={s.subject_id} value={s.subject_id}>
                        {s.subject_code} - {s.subject_name}
                      </option>
                    ))}
                  </select>
                </div>

                {gradebook.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped align-middle">
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Roll #</th>
                          <th>Section</th>
                          <th>Marks Obtained</th>
                          <th>Max Marks</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {gradebook.map((entry) => (
                          <MarksRow
                            key={entry.enrollment_id}
                            entry={entry}
                            onSave={submitMarks}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No students enrolled in this subject yet.</p>
                )}
              </>
            ) : (
              <p className="text-muted">No subjects assigned. Contact the administrator.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">All Students</div>
          <div className="card-body">
            {students.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th>Student ID</th>
                      <th>Name</th>
                      <th>Grade</th>
                      <th>Section</th>
                      <th>Roll #</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => (
                      <tr key={s.id}>
                        <td><code>{s.student_id}</code></td>
                        <td>{s.first_name} {s.last_name}</td>
                        <td><span className="badge bg-primary badge-grade">Grade {s.grade_level}</span></td>
                        <td><span className="badge bg-secondary badge-grade">Sec {s.section_no}</span></td>
                        <td>#{s.class_roll_no}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">No students found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MarksRow({ entry, onSave }) {
  const [marks, setMarks] = useState(entry.marks_obtained != null ? String(entry.marks_obtained) : '');
  const [maxMarks, setMaxMarks] = useState(entry.max_marks != null ? String(entry.max_marks) : '100');
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    if (marks === '' || maxMarks === '') return;
    setSaving(true);
    onSave(entry.enrollment_id, marks, maxMarks).finally(() => setSaving(false));
  };

  const pct = entry.marks_obtained != null && entry.max_marks > 0
    ? ((Number(entry.marks_obtained) / Number(entry.max_marks)) * 100).toFixed(1)
    : null;

  return (
    <tr>
      <td>
        <strong>{entry.first_name} {entry.last_name}</strong>
        <br /><small className="text-muted">{entry.student_id}</small>
      </td>
      <td>#{entry.class_roll_no}</td>
      <td>Sec {entry.section_no}</td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          style={{ width: '80px' }}
          min="0"
          max={maxMarks}
          value={marks}
          onChange={(e) => setMarks(e.target.value)}
          placeholder="--"
        />
      </td>
      <td>
        <input
          type="number"
          className="form-control form-control-sm"
          style={{ width: '80px' }}
          min="1"
          value={maxMarks}
          onChange={(e) => setMaxMarks(e.target.value)}
        />
      </td>
      <td>
        {pct != null ? (
          <span className={`badge ${Number(pct) >= 50 ? 'bg-success' : 'bg-danger'}`}>{pct}%</span>
        ) : (
          <span className="badge bg-secondary">Pending</span>
        )}
      </td>
      <td>
        <button
          className="btn btn-sm btn-primary"
          disabled={saving || marks === ''}
          onClick={handleSave}
        >
          {saving ? 'Saving...' : (entry.marks_obtained != null ? 'Update' : 'Save')}
        </button>
      </td>
    </tr>
  );
}
