import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ApiClient } from '../lib/api';

export default function CandidateProfile({ onStartQuiz }) {
  const { user, logout } = useAuth();
  const [attemptsHistory, setAttemptsHistory] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loadingAttempts, setLoadingAttempts] = useState(true);
  const [loadingLeaderboard, setLoadingLeaderboard] = useState(true);
  const [activeSubTab, setActiveSubTab] = useState('performance'); // 'performance' | 'leaderboard' | 'history'

  const displayName = user?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Candidate';
  const allowedAttempts = user?.allowedAttempts !== undefined ? user.allowedAttempts : 3;
  const remainingAttempts = user?.remainingAttempts !== undefined ? user.remainingAttempts : 3;
  const usedAttempts = Math.max(0, allowedAttempts - remainingAttempts);
  const percentRemaining = allowedAttempts > 0 ? Math.round((remainingAttempts / allowedAttempts) * 100) : 0;

  // Fetch past attempts and leaderboard
  useEffect(() => {
    fetchHistory();
    fetchLeaderboard();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoadingAttempts(true);
      const data = await ApiClient.get('/api/attempts/my');
      if (data && data.attempts) {
        setAttemptsHistory(data.attempts);
      }
    } catch (err) {
      console.warn('Notice loading candidate attempt history:', err.message);
    } finally {
      setLoadingAttempts(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      setLoadingLeaderboard(true);
      const data = await ApiClient.get('/api/attempts/leaderboard');
      if (data && data.leaderboard) {
        setLeaderboard(data.leaderboard);
      }
    } catch (err) {
      console.warn('Notice loading leaderboard:', err.message);
    } finally {
      setLoadingLeaderboard(false);
    }
  };

  // Performance calculations based on previous tests
  const stats = React.useMemo(() => {
    if (attemptsHistory.length === 0) {
      return {
        totalTests: 0,
        avgScore: 0,
        bestScore: 0,
        totalTimeSeconds: 0,
        totalQuestionsAnswered: 0,
        totalCorrect: 0
      };
    }

    const totalTests = attemptsHistory.length;
    const totalScoreSum = attemptsHistory.reduce((acc, cur) => acc + (cur.percentage || 0), 0);
    const avgScore = Math.round(totalScoreSum / totalTests);
    const bestScore = Math.max(...attemptsHistory.map(a => a.percentage || 0));
    const totalTimeSeconds = attemptsHistory.reduce((acc, cur) => acc + (cur.timeSpentSeconds || 0), 0);
    const totalQuestionsAnswered = attemptsHistory.reduce((acc, cur) => acc + (cur.totalQuestions || 0), 0);
    const totalCorrect = attemptsHistory.reduce((acc, cur) => acc + (cur.score || 0), 0);

    return {
      totalTests,
      avgScore,
      bestScore,
      totalTimeSeconds,
      totalQuestionsAnswered,
      totalCorrect
    };
  }, [attemptsHistory]);

  const formatDuration = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const getInitials = (name) => {
    if (!name) return 'C';
    const parts = name.trim().split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="candidate-profile-container">
      
      {/* 1. TOP HERO: CANDIDATE IDENTITY & BALANCE ATTEMPTS */}
      <div className="profile-hero-card glass-panel">
        <div className="profile-identity-col">
          <div className="profile-avatar-large">
            <span>{getInitials(displayName)}</span>
            <span className="online-indicator-dot" title="Active Account"></span>
          </div>

          <div className="profile-info-block">
            <div className="profile-title-row">
              <h2>{displayName}</h2>
              <span className="status-pill status-approved">🟢 APPROVED</span>
            </div>
            <p className="profile-email-sub">
              📧 <code>{user?.email}</code>
            </p>
            <div className="profile-meta-tags">
              <span className="meta-tag">🎓 Role: Candidate</span>
              <span className="meta-tag">⚡ Access: Unlimited Syllabus Practice</span>
            </div>
          </div>
        </div>

        {/* BALANCE ATTEMPTS WIDGET */}
        <div className="balance-attempts-widget glass-panel">
          <div className="balance-widget-header">
            <span className="balance-widget-title">🎟️ Balance Test Attempts</span>
            <span className={`balance-badge ${remainingAttempts > 0 ? 'badge-green' : 'badge-red'}`}>
              {remainingAttempts > 0 ? 'Active Quota' : 'Quota Depleted'}
            </span>
          </div>

          <div className="balance-count-display">
            <div className="balance-big-number">
              <span className="number-val">{remainingAttempts}</span>
              <span className="number-unit">/ {allowedAttempts}</span>
            </div>
            <span className="balance-subtext">Attempts Left</span>
          </div>

          {/* Progress Bar */}
          <div className="balance-progress-track">
            <div
              className={`balance-progress-fill ${remainingAttempts <= 1 ? 'fill-warning' : 'fill-good'}`}
              style={{ width: `${percentRemaining}%` }}
            ></div>
          </div>

          <div className="balance-breakdown-row">
            <span>Used: <strong>{usedAttempts} tests</strong></span>
            <span>Allowance: <strong>{allowedAttempts} tests</strong></span>
          </div>

          <p className="balance-hint">
            {remainingAttempts > 0
              ? '💡 1 attempt is deducted each time you start an assessment.'
              : '⚠️ All attempts consumed. Request your admin to grant +3 more tests.'}
          </p>
        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS: PERFORMANCE, LEADERBOARD, TEST HISTORY */}
      <div className="profile-subtabs-bar">
        <button
          className={`profile-subtab-btn ${activeSubTab === 'performance' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('performance')}
        >
          📊 Performance Analytics
        </button>

        <button
          className={`profile-subtab-btn ${activeSubTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('leaderboard')}
        >
          🏆 Candidate Leaderboard
        </button>

        <button
          className={`profile-subtab-btn ${activeSubTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('history')}
        >
          📜 Previous Test History ({attemptsHistory.length})
        </button>
      </div>

      {/* 3. TAB 1: PERFORMANCE BASED ON PREVIOUS TESTS */}
      {activeSubTab === 'performance' && (
        <div className="performance-tab-content">
          
          {/* Key Metrics Row */}
          <div className="profile-stats-grid">
            <div className="profile-stat-tile glass-panel tile-purple">
              <div className="p-stat-icon">📝</div>
              <div className="p-stat-body">
                <span className="p-stat-label">Tests Completed</span>
                <span className="p-stat-number">{stats.totalTests}</span>
                <span className="p-stat-sub">Across all chapters</span>
              </div>
            </div>

            <div className="profile-stat-tile glass-panel tile-cyan">
              <div className="p-stat-icon">🎯</div>
              <div className="p-stat-body">
                <span className="p-stat-label">Average Accuracy</span>
                <span className="p-stat-number">{stats.avgScore}%</span>
                <span className="p-stat-sub">
                  {stats.avgScore >= 80 ? '🌟 Outstanding' : stats.avgScore >= 50 ? '👍 Proficient' : stats.totalTests > 0 ? '📚 Needs Practice' : 'No tests yet'}
                </span>
              </div>
            </div>

            <div className="profile-stat-tile glass-panel tile-gold">
              <div className="p-stat-icon">🏆</div>
              <div className="p-stat-body">
                <span className="p-stat-label">Best Score</span>
                <span className="p-stat-number">{stats.bestScore}%</span>
                <span className="p-stat-sub">Highest recorded record</span>
              </div>
            </div>

            <div className="profile-stat-tile glass-panel tile-emerald">
              <div className="p-stat-icon">⏱️</div>
              <div className="p-stat-body">
                <span className="p-stat-label">Total Time Spent</span>
                <span className="p-stat-number">{formatDuration(stats.totalTimeSeconds)}</span>
                <span className="p-stat-sub">Time inside exam arena</span>
              </div>
            </div>
          </div>

          {/* Performance Deep Dive */}
          <div className="performance-summary-panel glass-panel">
            <div className="perf-summary-header">
              <div>
                <h3>Performance Assessment Summary</h3>
                <p className="text-subtle">Analysis calculated across all your completed MCQ tests.</p>
              </div>
              <button className="btn btn-primary" onClick={onStartQuiz}>
                🚀 Launch New Test
              </button>
            </div>

            <div className="perf-insights-row">
              <div className="perf-insight-card">
                <span className="perf-ins-title">Accuracy Rate</span>
                <div className="perf-gauge-track">
                  <div className="perf-gauge-fill" style={{ width: `${stats.avgScore}%` }}></div>
                </div>
                <div className="perf-ins-meta">
                  <span><strong>{stats.totalCorrect}</strong> Correct answers</span>
                  <span><strong>{stats.totalQuestionsAnswered}</strong> Total questions</span>
                </div>
              </div>

              <div className="perf-insight-card">
                <span className="perf-ins-title">Attempt Utilization</span>
                <div className="perf-gauge-track">
                  <div className="perf-gauge-fill fill-amber" style={{ width: `${Math.min(100, Math.round((usedAttempts / (allowedAttempts || 1)) * 100))}%` }}></div>
                </div>
                <div className="perf-ins-meta">
                  <span><strong>{usedAttempts}</strong> Tests taken</span>
                  <span><strong>{remainingAttempts}</strong> Remaining</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: CANDIDATE LEADERBOARD */}
      {activeSubTab === 'leaderboard' && (
        <div className="leaderboard-tab-content glass-panel">
          <div className="leaderboard-header-row">
            <div>
              <h3>🏆 QuizCraft Candidate Leaderboard</h3>
              <p className="text-subtle">Top ranking candidates based on test accuracy and performance.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchLeaderboard}>
              🔄 Refresh Rankings
            </button>
          </div>

          {loadingLeaderboard ? (
            <div className="table-loading-box">
              <span className="loading-spinner">⏳</span>
              <p>Loading candidate rankings...</p>
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="empty-profile-box">
              <span className="empty-icon">🏅</span>
              <h4>Leaderboard is Fresh</h4>
              <p>No candidate assessment records found yet. Complete a test to claim the #1 spot!</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Candidate</th>
                    <th>Tests Taken</th>
                    <th>Average Accuracy</th>
                    <th>Best Score</th>
                    <th>Total Questions</th>
                    <th style={{ textAlign: 'right' }}>Performance Status</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((item) => {
                    const isCurrentUser = (item.userId === (user?._id || user?.id));
                    const isTop1 = item.rank === 1;
                    const isTop2 = item.rank === 2;
                    const isTop3 = item.rank === 3;

                    return (
                      <tr key={item.userId} className={isCurrentUser ? 'row-current-user' : ''}>
                        <td>
                          <div className="rank-badge-cell">
                            {isTop1 ? (
                              <span className="medal-pill medal-gold">🥇 1st</span>
                            ) : isTop2 ? (
                              <span className="medal-pill medal-silver">🥈 2nd</span>
                            ) : isTop3 ? (
                              <span className="medal-pill medal-bronze">🥉 3rd</span>
                            ) : (
                              <span className="rank-number">#{item.rank}</span>
                            )}
                          </div>
                        </td>

                        <td>
                          <div className="leaderboard-user-cell">
                            <strong>{item.userName}</strong>
                            {isCurrentUser && <span className="you-pill">YOU</span>}
                            {item.email && <small className="text-subtle">{item.email}</small>}
                          </div>
                        </td>

                        <td><strong>{item.totalAttempts}</strong> tests</td>

                        <td>
                          <div className="score-cell-bar">
                            <span className="score-val-bold">{item.avgPercentage}%</span>
                            <div className="mini-meter-track">
                              <div className="mini-meter-fill" style={{ width: `${item.avgPercentage}%` }}></div>
                            </div>
                          </div>
                        </td>

                        <td>
                          <span className="best-score-badge">{item.bestScore}%</span>
                        </td>

                        <td>{item.totalQuestions} Qs</td>

                        <td style={{ textAlign: 'right' }}>
                          <span className={`perf-badge-pill ${item.avgPercentage >= 80 ? 'badge-elite' : item.avgPercentage >= 60 ? 'badge-good' : 'badge-fair'}`}>
                            {item.avgPercentage >= 80 ? '⭐ Elite' : item.avgPercentage >= 60 ? '👍 Good' : '📚 Rising'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 5. TAB 3: PREVIOUS TEST HISTORY */}
      {activeSubTab === 'history' && (
        <div className="history-tab-content glass-panel">
          <div className="history-header-row">
            <div>
              <h3>📜 Previous Test History Log</h3>
              <p className="text-subtle">Review your completed tests, scores, and completion times.</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={fetchHistory}>
              🔄 Refresh History
            </button>
          </div>

          {loadingAttempts ? (
            <div className="table-loading-box">
              <span className="loading-spinner">⏳</span>
              <p>Loading your test history...</p>
            </div>
          ) : attemptsHistory.length === 0 ? (
            <div className="empty-profile-box">
              <span className="empty-icon">📖</span>
              <h4>No Completed Tests Found</h4>
              <p>You haven't completed any assessments yet. Start a test from the MCQ Arena!</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={onStartQuiz}>
                Start Assessment
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="history-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Category / Chapter</th>
                    <th>Score</th>
                    <th>Accuracy %</th>
                    <th style={{ textAlign: 'right' }}>Time Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {attemptsHistory.map((att, idx) => {
                    const dateStr = att.createdAt ? new Date(att.createdAt).toLocaleString() : 'Recent';

                    return (
                      <tr key={att._id || idx}>
                        <td>
                          <div className="history-date-cell">
                            <strong>{dateStr}</strong>
                          </div>
                        </td>

                        <td>
                          <span className="ch-badge">{att.chapter || 'All Chapters'}</span>
                        </td>

                        <td>
                          <strong>{att.score}</strong> / {att.totalQuestions}
                        </td>

                        <td>
                          <span className={`percentage-pill ${att.percentage >= 80 ? 'pill-green' : att.percentage >= 50 ? 'pill-blue' : 'pill-red'}`}>
                            {att.percentage}%
                          </span>
                        </td>

                        <td style={{ textAlign: 'right' }}>
                          ⏱️ {formatDuration(att.timeSpentSeconds || 0)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}



    </div>
  );
}
