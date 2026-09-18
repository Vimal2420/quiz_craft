import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import AdminQuestionManager from './AdminQuestionManager';
import StudentQuizArena from './StudentQuizArena';
import CandidateProfile from './CandidateProfile';

export default function DashboardPlaceholder() {
  const { user, role, logout, usersList, approveUser, updateAttempts, rejectUser } = useAuth();
  const [adminActiveTab, setAdminActiveTab] = useState('questions'); // 'questions' or 'approvals'
  const [studentActiveTab, setStudentActiveTab] = useState('quiz'); // 'quiz' or 'profile'
  const [actionNotice, setActionNotice] = useState('');
  const [attemptsInputs, setAttemptsInputs] = useState({}); // { [userId]: number }
  const [refillInputs, setRefillInputs] = useState({}); // { [userId]: number }

  const [searchPendingQuery, setSearchPendingQuery] = useState('');
  const [searchApprovedQuery, setSearchApprovedQuery] = useState('');

  const displayName = user?.user_metadata?.name || user?.name || user?.email?.split('@')[0] || 'User';

  const pendingUsers = usersList ? usersList.filter(u => u.role === 'user' && u.status === 'pending') : [];
  const approvedUsers = usersList ? usersList.filter(u => u.role === 'user' && u.status === 'approved') : [];

  const filteredPendingUsers = pendingUsers.filter(u =>
    (u.name || '').toLowerCase().includes(searchPendingQuery.toLowerCase().trim()) ||
    (u.email || '').toLowerCase().includes(searchPendingQuery.toLowerCase().trim())
  );

  const filteredApprovedUsers = approvedUsers.filter(u =>
    (u.name || '').toLowerCase().includes(searchApprovedQuery.toLowerCase().trim()) ||
    (u.email || '').toLowerCase().includes(searchApprovedQuery.toLowerCase().trim())
  );

  const handleApprove = async (userId, userName) => {
    const allowedCount = Number(attemptsInputs[userId]) > 0 ? Number(attemptsInputs[userId]) : 3;
    await approveUser(userId, allowedCount);
    setActionNotice(`Approved access for candidate ${userName} with ${allowedCount} allowed test attempts!`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  const handleRefill = async (userId, userName, currentRemaining, currentAllowed) => {
    const rawVal = refillInputs[userId];
    const addCount = Number(rawVal);
    if (!rawVal || isNaN(addCount) || addCount <= 0) {
      alert('Please enter a valid top-up number of attempts.');
      return;
    }

    const newRemaining = currentRemaining + addCount;
    const newAllowed = currentAllowed + addCount;
    await updateAttempts(userId, newAllowed, newRemaining);
    // Clear input after top-up
    setRefillInputs(prev => ({ ...prev, [userId]: '' }));
    setActionNotice(`Topped up +${addCount} test attempts for ${userName} (${newRemaining} now remaining).`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  const handleReject = (userId, userName) => {
    rejectUser(userId);
    setActionNotice(`Rejected registration request for candidate ${userName}.`);
    setTimeout(() => setActionNotice(''), 4000);
  };

  return (
    <div className="dashboard-view-wrapper">
      <div className="dashboard-container glass-panel">
        
        {/* Header Bar */}
        <div className="dashboard-header-bar">
          <div className="brand-logo-area">
            <span className="brand-icon">⚡</span>
            <h2>QuizCraft Portal</h2>
          </div>

          <div className="user-control-area">
            <div className="user-pill">
              <span className={`role-badge ${role === 'admin' ? 'role-admin' : 'role-user'}`}>
                {role === 'admin' ? '🛡️ ADMIN' : '👤 STUDENT'}
              </span>
              <span className="user-name">{displayName}</span>
            </div>
            <button className="btn btn-logout" onClick={logout}>
              Sign Out
            </button>
          </div>
        </div>

        {/* Action Notice Alert */}
        {actionNotice && (
          <div className="alert-box alert-success" style={{ margin: '1.5rem 0 0 0' }}>
            <span className="alert-icon">✅</span>
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Normal User View */}
        {role !== 'admin' ? (
          <div className="student-portal-dashboard">
            {/* Student Section Tabs Bar */}
            <div className="admin-section-tabs-bar" style={{ marginBottom: '1.5rem' }}>
              <button
                className={`admin-sec-tab ${studentActiveTab === 'quiz' ? 'active' : ''}`}
                onClick={() => setStudentActiveTab('quiz')}
              >
                🎯 Attend MCQ Assessment
              </button>

              <button
                className={`admin-sec-tab ${studentActiveTab === 'profile' ? 'active' : ''}`}
                onClick={() => setStudentActiveTab('profile')}
              >
                👤 Candidate Profile
              </button>
            </div>

            {studentActiveTab === 'quiz' ? (
              <StudentQuizArena />
            ) : (
              <CandidateProfile onStartQuiz={() => setStudentActiveTab('quiz')} />
            )}
          </div>
        ) : (
          /* Admin View with Questions & Approvals Tabs */
          <div className="admin-portal-dashboard">
            <div className="admin-overview-header">
              <div>
                <h1>Administrator Control Center</h1>
                <p className="welcome-sub" style={{ margin: '0.25rem 0 0 0' }}>
                  Author chapter MCQs, manage syllabus questions, and review user approvals.
                </p>
              </div>
            </div>

            {/* Admin Section Tabs */}
            <div className="admin-section-tabs-bar">
              <button
                className={`admin-sec-tab ${adminActiveTab === 'questions' ? 'active' : ''}`}
                onClick={() => setAdminActiveTab('questions')}
              >
                📚 Chapter Questions (MCQs)
              </button>

              <button
                className={`admin-sec-tab ${adminActiveTab === 'approvals' ? 'active' : ''}`}
                onClick={() => setAdminActiveTab('approvals')}
              >
                👥 User Approvals
                {pendingUsers.length > 0 && (
                  <span className="badge-pill-alert">{pendingUsers.length}</span>
                )}
              </button>
            </div>

            {/* TAB 1: CHAPTER QUESTIONS (MCQ BUILDER) */}
            {adminActiveTab === 'questions' && (
              <AdminQuestionManager />
            )}

            {/* TAB 2: USER APPROVAL REQUESTS */}
            {adminActiveTab === 'approvals' && (
              <div>
                {/* Quick Stat Tiles */}
                <div className="admin-stat-tiles">
                  <div className="stat-tile">
                    <span className="tile-icon">⏳</span>
                    <div className="tile-data">
                      <span className="tile-number">{pendingUsers.length}</span>
                      <span className="tile-title">Pending Approvals</span>
                    </div>
                  </div>
                  <div className="stat-tile">
                    <span className="tile-icon">👥</span>
                    <div className="tile-data">
                      <span className="tile-number">{approvedUsers.length}</span>
                      <span className="tile-title">Active Approved Users</span>
                    </div>
                  </div>
                </div>

                {/* Section: Pending Requests */}
                <div className="admin-card-section">
                  <div className="section-title-row">
                    <div className="title-with-badge">
                      <h3>Pending User Registration Requests</h3>
                      <span className={`counter-badge ${pendingUsers.length > 0 ? 'badge-amber' : 'badge-gray'}`}>
                        {pendingUsers.length} Pending
                      </span>
                    </div>

                    {pendingUsers.length > 0 && (
                      <div className="user-search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          placeholder="Search pending by name or email..."
                          value={searchPendingQuery}
                          onChange={(e) => setSearchPendingQuery(e.target.value)}
                          className="user-search-input"
                        />
                        {searchPendingQuery && (
                          <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => setSearchPendingQuery('')}
                            title="Clear search"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {pendingUsers.length === 0 ? (
                    <div className="empty-requests-box">
                      <span className="empty-icon">✨</span>
                      <p>All caught up! There are no pending registration requests at this time.</p>
                    </div>
                  ) : filteredPendingUsers.length === 0 ? (
                    <div className="empty-requests-box">
                      <span className="empty-icon">🔍</span>
                      <p>No pending requests match "<strong>{searchPendingQuery}</strong>".</p>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSearchPendingQuery('')} style={{ marginTop: '0.5rem' }}>
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="approval-table">
                        <thead>
                          <tr>
                            <th>Candidate Name</th>
                            <th>Email Address</th>
                            <th>Registered Date</th>
                            <th>Status</th>
                            <th>Allowed Tests</th>
                            <th style={{ textAlign: 'right' }}>Admin Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredPendingUsers.map(u => (
                            <tr key={u.id}>
                              <td><strong>{u.name}</strong></td>
                              <td><code>{u.email}</code></td>
                              <td>{new Date(u.createdAt || u.created_at).toLocaleDateString()}</td>
                              <td><span className="status-pill status-pending">⏳ PENDING</span></td>
                              <td>
                                <div className="attempts-input-wrapper">
                                  <input
                                    type="number"
                                    min="1"
                                    max="99"
                                    value={attemptsInputs[u.id] !== undefined ? attemptsInputs[u.id] : 3}
                                    onChange={(e) => setAttemptsInputs(prev => ({ ...prev, [u.id]: Math.max(1, Number(e.target.value)) }))}
                                    className="attempts-table-input"
                                    title="Allowed test count on approval"
                                  />
                                  <span className="attempts-input-label">tests</span>
                                </div>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <div className="action-btn-group">
                                  <button
                                    className="btn btn-sm btn-approve"
                                    onClick={() => handleApprove(u.id, u.name)}
                                  >
                                    ✓ Approve
                                  </button>
                                  <button
                                    className="btn btn-sm btn-reject"
                                    onClick={() => handleReject(u.id, u.name)}
                                  >
                                    ✕ Reject
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Section: Approved Users */}
                <div className="admin-card-section" style={{ marginTop: '2rem' }}>
                  <div className="section-title-row">
                    <div className="title-with-badge">
                      <h3>Approved Active Users ({approvedUsers.length})</h3>
                      <span className="text-subtle">Users permitted to take quizzes</span>
                    </div>

                    {approvedUsers.length > 0 && (
                      <div className="user-search-wrapper">
                        <span className="search-icon">🔍</span>
                        <input
                          type="text"
                          placeholder="Search active users by name or email..."
                          value={searchApprovedQuery}
                          onChange={(e) => setSearchApprovedQuery(e.target.value)}
                          className="user-search-input"
                        />
                        {searchApprovedQuery && (
                          <button
                            type="button"
                            className="clear-search-btn"
                            onClick={() => setSearchApprovedQuery('')}
                            title="Clear search"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {approvedUsers.length === 0 ? (
                    <div className="empty-requests-box">
                      <span className="empty-icon">👥</span>
                      <p>No approved users yet.</p>
                    </div>
                  ) : filteredApprovedUsers.length === 0 ? (
                    <div className="empty-requests-box">
                      <span className="empty-icon">🔍</span>
                      <p>No approved users match "<strong>{searchApprovedQuery}</strong>".</p>
                      <button className="btn btn-secondary btn-sm" onClick={() => setSearchApprovedQuery('')} style={{ marginTop: '0.5rem' }}>
                        Clear Search
                      </button>
                    </div>
                  ) : (
                    <div className="table-wrapper">
                      <table className="approval-table">
                        <thead>
                          <tr>
                            <th>Candidate Name</th>
                            <th>Email Address</th>
                            <th>Status</th>
                            <th>Test Attempts & Top-up</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredApprovedUsers.map(u => {
                            const remaining = u.remainingAttempts !== undefined ? u.remainingAttempts : 3;
                            const allowed = u.allowedAttempts !== undefined ? u.allowedAttempts : 3;
                            const currentInput = refillInputs[u.id] || '';
                            return (
                              <tr key={u.id}>
                                <td><strong>{u.name}</strong></td>
                                <td><code>{u.email}</code></td>
                                <td><span className="status-pill status-approved">✓ APPROVED</span></td>
                                <td>
                                  <div className="attempts-cell-badge">
                                    <span className={`attempts-count-pill ${remaining === 0 ? 'pill-depleted' : 'pill-available'}`}>
                                      🎫 {remaining} left / {allowed} total
                                    </span>
                                    <div className="custom-refill-group">
                                      <input
                                        type="number"
                                        min="1"
                                        max="999"
                                        placeholder="Top-up"
                                        value={currentInput}
                                        onChange={(e) => setRefillInputs(prev => ({ ...prev, [u.id]: e.target.value }))}
                                        className="refill-number-input"
                                        title="Enter number of test attempts to top-up"
                                      />
                                      <button
                                        className="btn-refill-sm"
                                        onClick={() => handleRefill(u.id, u.name, remaining, allowed)}
                                        disabled={!currentInput || Number(currentInput) <= 0}
                                        title={currentInput ? `Top-up +${currentInput} test attempts` : 'Enter a number to top-up'}
                                      >
                                        + Top-up
                                      </button>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
