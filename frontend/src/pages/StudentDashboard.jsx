import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useAuth } from '../components/AuthProvider';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const loadStudent = async () => {
      try {
        const [profileRes, enrollRes, resultsRes] = await Promise.all([
          axios.get('/api/students/me'),
          axios.get('/api/students/me').then(r => {
            const sid = r.data.student?.id;
            return sid ? axios.get(`/api/students/${sid}/enrollments`) : { data: { enrollments: [] } };
          }).catch(() => ({ data: { enrollments: [] } })),
          axios.get('/api/marks/my-results').catch(() => ({ data: null }))
        ]);

        if (!mounted) return;
        setStudent(profileRes.data.student || null);
        setEnrollments(enrollRes.data.enrollments || []);
        if (resultsRes.data) setResults(resultsRes.data);
      } catch (err) {
        if (!mounted) return;
        setError(err.response?.data?.message || 'Failed to load student data.');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadStudent();
    return () => { mounted = false; };
  }, []);

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

  if (error) {
    return (
      <div className="alert alert-danger">
        <strong>Error:</strong> {error}
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header">
        <h2>Student Dashboard</h2>
        <p>Welcome, {student?.first_name || user?.username}. Here is your academic overview.</p>
      </div>

      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            Profile
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'enrollments' ? 'active' : ''}`} onClick={() => setActiveTab('enrollments')}>
            My Subjects
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'results' ? 'active' : ''}`} onClick={() => setActiveTab('results')}>
            Results
          </button>
        </li>
      </ul>

      {activeTab === 'profile' && (
        <div className="row g-3">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-primary text-white">Student Profile</div>
              <div className="card-body">
                {student ? (
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr><td className="text-muted" style={{ width: '40%' }}>Student ID</td><td><strong>{student.student_id}</strong></td></tr>
                      <tr><td className="text-muted">Full Name</td><td><strong>{student.first_name} {student.last_name}</strong></td></tr>
                      <tr><td className="text-muted">Grade</td><td><span className="badge bg-primary badge-grade">Grade {student.grade_level}</span></td></tr>
                      <tr><td className="text-muted">Section</td><td><span className="badge bg-secondary badge-grade">Section {student.section_no}</span></td></tr>
                      <tr><td className="text-muted">Class Roll No</td><td><strong>#{student.class_roll_no}</strong></td></tr>
                      {student.date_of_birth && (
                        <tr><td className="text-muted">Date of Birth</td><td>{student.date_of_birth}</td></tr>
                      )}
                      <tr><td className="text-muted">Username</td><td>{user?.username}</td></tr>
                      <tr><td className="text-muted">Email</td><td>{user?.email}</td></tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted mb-0">No student profile linked to your account. Contact the administrator.</p>
                )}
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-header bg-success text-white">Elective Information</div>
              <div className="card-body">
                {student?.grade_level >= 9 ? (
                  <table className="table table-borderless mb-0">
                    <tbody>
                      <tr><td className="text-muted" style={{ width: '40%' }}>Elective Track</td><td><span className="badge bg-info text-dark badge-grade">{student.elective_track}</span></td></tr>
                      {student.elective_subject && (
                        <tr><td className="text-muted">Elective Subject</td><td><strong>{student.elective_subject}</strong></td></tr>
                      )}
                      <tr>
                        <td className="text-muted">Status</td>
                        <td>
                          {student.elective_locked ? (
                            <span className="badge bg-warning text-dark">Locked</span>
                          ) : (
                            <span className="badge bg-success">Editable</span>
                          )}
                        </td>
                      </tr>
                      <tr><td colSpan="2" className="text-muted small pt-2">
                        {student.grade_level === 10
                          ? 'Your electives are locked for Grade 10. Contact the administrator for any changes.'
                          : 'You may change your elective selection. Changes take effect immediately.'
                        }
                      </td></tr>
                    </tbody>
                  </table>
                ) : (
                  <p className="text-muted mb-0">Elective selection begins in Grade 9. You are currently in Grade {student?.grade_level || 'N/A'}.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'enrollments' && (
        <div className="card shadow-sm">
          <div className="card-header bg-primary text-white">My Enrolled Subjects</div>
          <div className="card-body">
            {enrollments.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-striped align-middle mb-0">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Subject Code</th>
                      <th>Subject Name</th>
                      <th>Academic Year</th>
                      <th>Term</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrollments.map((e, i) => (
                      <tr key={e.id}>
                        <td>{i + 1}</td>
                        <td><code>{e.subject_code}</code></td>
                        <td>{e.subject_name}</td>
                        <td>{e.academic_year}</td>
                        <td><span className="badge bg-secondary">{e.term.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-muted mb-0">No enrollments found. Contact the administrator if this seems incorrect.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="row g-3">
          {results && (
            <div className="col-12">
              <div className="card shadow-sm">
                <div className="card-header bg-success text-white">Overall Performance</div>
                <div className="card-body">
                  <div className="row text-center">
                    <div className="col-md-4 stat-card">
                      <div className="stat-value text-primary">{results.result.total_obtained}</div>
                      <div className="stat-label">Total Obtained</div>
                    </div>
                    <div className="col-md-4 stat-card">
                      <div className="stat-value text-secondary">{results.result.total_max}</div>
                      <div className="stat-label">Total Maximum</div>
                    </div>
                    <div className="col-md-4 stat-card">
                      <div className={`stat-value ${results.result.overall_percentage >= 50 ? 'text-success' : 'text-danger'}`}>
                        {results.result.overall_percentage}%
                      </div>
                      <div className="stat-label">Overall Percentage</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-primary text-white">Subject-wise Results</div>
              <div className="card-body">
                {results && results.marks.length > 0 ? (
                  <div className="table-responsive">
                    <table className="table table-striped align-middle mb-0">
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Subject</th>
                          <th>Term</th>
                          <th>Marks Obtained</th>
                          <th>Max Marks</th>
                          <th>Percentage</th>
                          <th>Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.marks.map((m, i) => {
                          const pct = m.percentage || 0;
                          let grade = 'F';
                          let gradeClass = 'bg-danger';
                          if (pct >= 90) { grade = 'A+'; gradeClass = 'bg-success'; }
                          else if (pct >= 80) { grade = 'A'; gradeClass = 'bg-success'; }
                          else if (pct >= 70) { grade = 'B'; gradeClass = 'bg-info text-dark'; }
                          else if (pct >= 60) { grade = 'C'; gradeClass = 'bg-warning text-dark'; }
                          else if (pct >= 50) { grade = 'D'; gradeClass = 'bg-warning text-dark'; }

                          return (
                            <tr key={i}>
                              <td>{i + 1}</td>
                              <td>
                                <strong>{m.subject_name}</strong>
                                <br /><small className="text-muted">{m.subject_code}</small>
                              </td>
                              <td><span className="badge bg-secondary">{m.term.replace('_', ' ')}</span></td>
                              <td><strong>{m.marks_obtained}</strong></td>
                              <td>{m.max_marks}</td>
                              <td><strong>{pct}%</strong></td>
                              <td><span className={`badge ${gradeClass}`}>{grade}</span></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted mb-0">No results available yet. Your teachers will enter marks after assessments.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
