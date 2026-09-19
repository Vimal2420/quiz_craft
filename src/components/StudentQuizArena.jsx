import React, { useState, useEffect, useRef } from 'react';
import { QuestionsStore } from '../lib/questionsStore';
import { ApiClient } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function StudentQuizArena() {
  const { user, refreshUser } = useAuth();
  const remainingAttempts = user?.remainingAttempts !== undefined ? user.remainingAttempts : 3;
  const allowedAttempts = user?.allowedAttempts !== undefined ? user.allowedAttempts : 3;

  // Master data
  const [allQuestions, setAllQuestions] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(true);

  // Screen state: 'config' | 'active' | 'review'
  const [screen, setScreen] = useState('config');

  // Main Heading: Choose Category (Only ONE category can be selected/attended at a time)
  // Options: 'chapter_wise' | 'question_volume' | 'time_duration'
  const [selectedCategory, setSelectedCategory] = useState('chapter_wise');

  // Category 1: Chapter Wise state
  const [selectedChapter, setSelectedChapter] = useState('');

  // Category 2: Question Volume state ('full' | 'half' | number)
  const [volumeType, setVolumeType] = useState('full');

  // Category 3: Time and Exam Duration state (Max 120 mins / 2 hours, no unlimited time)
  const [timeDurationMins, setTimeDurationMins] = useState(30);

  const [randomizeOrder, setRandomizeOrder] = useState(true);

  // Active Quiz State
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [questionId]: optionIndex }
  const [flaggedQuestions, setFlaggedQuestions] = useState(new Set());
  const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);
  const [totalTimeSpentSeconds, setTotalTimeSpentSeconds] = useState(0);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [timeExpiredAlert, setTimeExpiredAlert] = useState(false);
  const [restoredSessionNotice, setRestoredSessionNotice] = useState(false);

  // Review State
  const [reviewFilter, setReviewFilter] = useState('all'); // 'all' | 'incorrect' | 'correct'

  // Timer Ref
  const timerRef = useRef(null);

  // Session persistence helpers
  const getSessionKey = () => (user ? `qc_active_session_${user._id || user.id}` : null);

  const clearActiveSession = () => {
    const key = getSessionKey();
    if (key) {
      localStorage.removeItem(key);
    }
  };

  // Load questions on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      setLoadingQuestions(true);
      const data = await QuestionsStore.getQuestions();
      setAllQuestions(data || []);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Derive available chapters with question counts
  const chapterCounts = React.useMemo(() => {
    const counts = {};
    allQuestions.forEach(q => {
      const ch = q.chapter || 'General';
      counts[ch] = (counts[ch] || 0) + 1;
    });
    return counts;
  }, [allQuestions]);

  const chapterList = Object.keys(chapterCounts).sort();

  // Initialize selectedChapter
  useEffect(() => {
    if (chapterList.length > 0 && !selectedChapter) {
      setSelectedChapter(chapterList[0]);
    }
  }, [chapterList, selectedChapter]);

  // Derive active assessment settings based on which ONE category is chosen
  const activeAssessment = React.useMemo(() => {
    let pool = [];
    let count = 0;
    let duration = 0; // in minutes (0 means self-paced / no countdown)
    let label = '';
    let detail = '';
    const hasCountdown = selectedCategory === 'time_duration';

    if (selectedCategory === 'chapter_wise') {
      label = '1. Chapter Wise';
      detail = selectedChapter ? `Chapter: ${selectedChapter}` : 'Select a chapter';
      pool = allQuestions.filter(q => (q.chapter || 'General') === selectedChapter);
      count = pool.length;
      duration = 0; // No countdown
    } else if (selectedCategory === 'question_volume') {
      label = '2. Question Volume';
      pool = [...allQuestions];
      if (volumeType === 'half') {
        count = Math.max(1, Math.ceil(pool.length / 2));
      } else if (typeof volumeType === 'number') {
        count = Math.min(pool.length, volumeType);
      } else {
        count = pool.length;
      }
      detail = `${count} Questions (${volumeType === 'half' ? '50% sample' : volumeType === 'full' ? '100% full' : `${count} Qs`})`;
      duration = 0; // No countdown
    } else if (selectedCategory === 'time_duration') {
      label = '3. Time and Exam Duration';
      pool = [...allQuestions];
      count = pool.length;
      duration = Math.min(120, Math.max(1, timeDurationMins)); // strictly max 120 mins (2 hrs)
      detail = `${duration} Minutes Countdown (Strictly timed, auto-submits at 00:00)`;
    }

    return {
      pool,
      count,
      duration,
      hasCountdown,
      label,
      detail
    };
  }, [selectedCategory, selectedChapter, volumeType, timeDurationMins, allQuestions]);

  // Auto-restore test session if student refreshed or reloaded during active exam
  useEffect(() => {
    if (!user) return;
    const sessionKey = getSessionKey();
    if (!sessionKey) return;

    const saved = localStorage.getItem(sessionKey);
    if (!saved) return;

    try {
      const data = JSON.parse(saved);
      if (data && data.screen === 'active' && Array.isArray(data.quizQuestions) && data.quizQuestions.length > 0) {
        let resumeTimeLeft = data.timeLeftSeconds || 0;
        let resumeTimeSpent = data.totalTimeSpentSeconds || 0;

        if (data.selectedCategory === 'time_duration' && data.lastSaved) {
          const secondsAway = Math.floor((Date.now() - data.lastSaved) / 1000);
          resumeTimeLeft = Math.max(0, resumeTimeLeft - secondsAway);
          resumeTimeSpent += secondsAway;

          if (resumeTimeLeft <= 0) {
            // Expired while away
            setQuizQuestions(data.quizQuestions);
            setUserAnswers(data.userAnswers || {});
            setTimeExpiredAlert(true);
            setScreen('review');
            clearActiveSession();
            return;
          }
        }

        setSelectedCategory(data.selectedCategory || 'chapter_wise');
        if (data.selectedChapter) setSelectedChapter(data.selectedChapter);
        if (data.volumeType) setVolumeType(data.volumeType);
        if (data.timeDurationMins) setTimeDurationMins(data.timeDurationMins);
        setQuizQuestions(data.quizQuestions);
        setCurrentIndex(data.currentIndex || 0);
        setUserAnswers(data.userAnswers || {});
        setFlaggedQuestions(new Set(data.flaggedQuestions || []));
        setTimeLeftSeconds(resumeTimeLeft);
        setTotalTimeSpentSeconds(resumeTimeSpent);
        setScreen('active');
        setRestoredSessionNotice(true);
        setTimeout(() => setRestoredSessionNotice(false), 6000);
      }
    } catch (err) {
      console.warn('Could not restore previous test session:', err);
      clearActiveSession();
    }
  }, [user]);

  // Persist active test session to localStorage on progress changes
  useEffect(() => {
    if (!user || screen !== 'active' || quizQuestions.length === 0) return;

    const sessionKey = getSessionKey();
    if (!sessionKey) return;

    const sessionPayload = {
      screen: 'active',
      selectedCategory,
      selectedChapter,
      volumeType,
      timeDurationMins,
      quizQuestions,
      currentIndex,
      userAnswers,
      flaggedQuestions: Array.from(flaggedQuestions),
      timeLeftSeconds,
      totalTimeSpentSeconds,
      lastSaved: Date.now()
    };

    try {
      localStorage.setItem(sessionKey, JSON.stringify(sessionPayload));
    } catch (e) {
      console.warn('Unable to persist test session to localStorage:', e);
    }
  }, [user, screen, selectedCategory, selectedChapter, volumeType, timeDurationMins, quizQuestions, currentIndex, userAnswers, flaggedQuestions, timeLeftSeconds, totalTimeSpentSeconds]);

  // Timer Effect: Countdown strictly applies ONLY to Category 3 (time_duration).
  // Category 1 (Chapter Wise) and Category 2 (Question Volume) have NO countdown timer!
  useEffect(() => {
    if (screen === 'active') {
      timerRef.current = setInterval(() => {
        setTotalTimeSpentSeconds(prev => prev + 1);

        if (selectedCategory === 'time_duration') {
          setTimeLeftSeconds(prev => {
            if (prev <= 1) {
              clearInterval(timerRef.current);
              handleAutoSubmitOnTimeOut();
              return 0;
            }
            return prev - 1;
          });
        }
      }, 1000);

      return () => clearInterval(timerRef.current);
    }
  }, [screen, selectedCategory]);

  const [startingTest, setStartingTest] = useState(false);

  // Start Test Action for the ONE chosen category (Consumes 1 attempt immediately on start)
  const handleStartTest = async () => {
    let pool = [...activeAssessment.pool];
    if (pool.length === 0) return;

    if (user?.role === 'user' && remainingAttempts <= 0) {
      alert('You have exhausted all allowed test attempts. Please contact your administrator.');
      return;
    }

    try {
      setStartingTest(true);
      // Immediately consume 1 attempt on start so exiting/closing does not bypass attempt count
      if (user?.role === 'user') {
        await ApiClient.post('/api/attempts/start');
        await refreshUser();
      }

      clearActiveSession();

      if (randomizeOrder) {
        pool = pool.sort(() => Math.random() - 0.5);
      }

      // Slice for question volume if in question_volume mode
      if (selectedCategory === 'question_volume') {
        pool = pool.slice(0, activeAssessment.count);
      }

      setQuizQuestions(pool);
      setCurrentIndex(0);
      setUserAnswers({});
      setFlaggedQuestions(new Set());
      setTimeExpiredAlert(false);
      setShowSubmitModal(false);
      setTotalTimeSpentSeconds(0);
      
      // Countdown ONLY for time_duration mode
      if (selectedCategory === 'time_duration') {
        setTimeLeftSeconds(activeAssessment.duration * 60);
      } else {
        setTimeLeftSeconds(0);
      }

      setScreen('active');
    } catch (err) {
      console.error('Failed to start test:', err);
      alert(err.message || 'Unable to start test. Please verify your attempts.');
    } finally {
      setStartingTest(false);
    }
  };

  // Auto-submit when countdown hits zero
  const handleAutoSubmitOnTimeOut = async () => {
    clearActiveSession();
    setTimeExpiredAlert(true);
    setShowSubmitModal(false);
    setScreen('review');

    try {
      await ApiClient.post('/api/attempts', {
        chapter: selectedCategory === 'chapter_wise'
          ? (selectedChapter || 'Chapter Wise')
          : (selectedCategory === 'question_volume' ? 'Question Volume Test' : 'Timed Assessment Test'),
        score: results.correctCount,
        totalQuestions: results.total,
        percentage: results.percentage,
        timeSpentSeconds: totalTimeSpentSeconds,
        answers: userAnswers
      });
      await refreshUser();
    } catch (err) {
      console.warn('Notice saving attempt on timeout:', err.message);
    }
  };

  // Answer selection
  const handleSelectOption = (optionIndex) => {
    const currentQ = quizQuestions[currentIndex];
    if (!currentQ) return;
    setUserAnswers(prev => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));
  };

  // Clear answer for current question
  const handleClearAnswer = () => {
    const currentQ = quizQuestions[currentIndex];
    if (!currentQ) return;
    setUserAnswers(prev => {
      const copy = { ...prev };
      delete copy[currentQ.id];
      return copy;
    });
  };

  // Toggle flag for review
  const handleToggleFlag = () => {
    const currentQ = quizQuestions[currentIndex];
    if (!currentQ) return;
    setFlaggedQuestions(prev => {
      const next = new Set(prev);
      if (next.has(currentQ.id)) {
        next.delete(currentQ.id);
      } else {
        next.add(currentQ.id);
      }
      return next;
    });
  };

  // Manual Submit Test
  const handleSubmitTest = async () => {
    clearActiveSession();
    if (timerRef.current) clearInterval(timerRef.current);
    setShowSubmitModal(false);
    setScreen('review');

    try {
      await ApiClient.post('/api/attempts', {
        chapter: selectedCategory === 'chapter_wise'
          ? (selectedChapter || 'Chapter Wise')
          : (selectedCategory === 'question_volume' ? 'Question Volume Test' : 'Timed Assessment Test'),
        score: results.correctCount,
        totalQuestions: results.total,
        percentage: results.percentage,
        timeSpentSeconds: totalTimeSpentSeconds,
        answers: userAnswers
      });
      await refreshUser();
    } catch (err) {
      console.warn('Notice saving attempt to backend:', err.message);
    }
  };

  // Calculate Results
  const results = React.useMemo(() => {
    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    quizQuestions.forEach(q => {
      const chosen = userAnswers[q.id];
      if (chosen === undefined) {
        unansweredCount++;
      } else if (Number(chosen) === Number(q.correct_index)) {
        correctCount++;
      } else {
        incorrectCount++;
      }
    });

    const total = quizQuestions.length;
    const percentage = total > 0 ? Math.round((correctCount / total) * 100) : 0;

    return {
      total,
      correctCount,
      incorrectCount,
      unansweredCount,
      percentage
    };
  }, [quizQuestions, userAnswers]);

  // Format MM:SS helper
  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Current Active Question
  const currentQ = quizQuestions[currentIndex];
  const isCurrentFlagged = currentQ && flaggedQuestions.has(currentQ.id);
  const currentAnswer = currentQ ? userAnswers[currentQ.id] : undefined;

  // Render: Loading Screen
  if (loadingQuestions) {
    return (
      <div className="test-arena-loading glass-panel">
        <div className="spinner"></div>
        <p>Loading syllabus questions from question bank...</p>
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 1: TEST SETUP & CONFIGURATION (LOBBY)
  // ----------------------------------------------------
  if (screen === 'config') {
    return (
      <div className="test-config-view">
        {/* Header without Back to Profile button */}
        <div className="test-config-header">
          <div>
            <h2>🎯 Choose Category</h2>
          </div>
        </div>

        {allQuestions.length === 0 ? (
          <div className="empty-bank-warning glass-panel">
            <span className="warning-icon">📭</span>
            <h3>Question Bank is Empty</h3>
            <p>
              Your administrator hasn't added questions yet. Once the admin adds chapter MCQs, they will automatically appear here for you to practice.
            </p>
          </div>
        ) : (
          <>
            {/* The 3 Categories - Candidate selects ONLY ONE category at a time */}
            <div className="category-selection-cards">
              {/* Option 1: Chapter Wise */}
              <div
                className={`category-select-card ${selectedCategory === 'chapter_wise' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('chapter_wise')}
              >
                <div className="cat-card-header">
                  <span className="cat-radio">{selectedCategory === 'chapter_wise' ? '◉' : '○'}</span>
                  <span className="cat-badge">Category 1</span>
                </div>
                <div className="cat-card-body">
                  <span className="cat-icon">📖</span>
                  <h3>1. Chapter Wise</h3>
                  <p>Attend test on a specific syllabus chapter (Self-paced, no countdown).</p>
                </div>
                <div className="cat-card-footer">
                  <span>{selectedCategory === 'chapter_wise' ? '✓ Selected to Attend' : 'Click to select'}</span>
                </div>
              </div>

              {/* Option 2: Question Volume */}
              <div
                className={`category-select-card ${selectedCategory === 'question_volume' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('question_volume')}
              >
                <div className="cat-card-header">
                  <span className="cat-radio">{selectedCategory === 'question_volume' ? '◉' : '○'}</span>
                  <span className="cat-badge">Category 2</span>
                </div>
                <div className="cat-card-body">
                  <span className="cat-icon">📊</span>
                  <h3>2. Question Volume</h3>
                  <p>Attend test with fixed or sample questions (Self-paced, no countdown).</p>
                </div>
                <div className="cat-card-footer">
                  <span>{selectedCategory === 'question_volume' ? '✓ Selected to Attend' : 'Click to select'}</span>
                </div>
              </div>

              {/* Option 3: Time and Exam Duration */}
              <div
                className={`category-select-card ${selectedCategory === 'time_duration' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('time_duration')}
              >
                <div className="cat-card-header">
                  <span className="cat-radio">{selectedCategory === 'time_duration' ? '◉' : '○'}</span>
                  <span className="cat-badge">Category 3</span>
                </div>
                <div className="cat-card-body">
                  <span className="cat-icon">⏱️</span>
                  <h3>3. Time and Exam Duration</h3>
                  <p>Strictly timed assessment (Max 2 Hours countdown, auto-submits at 00:00).</p>
                </div>
                <div className="cat-card-footer">
                  <span>{selectedCategory === 'time_duration' ? '✓ Selected to Attend' : 'Click to select'}</span>
                </div>
              </div>
            </div>

            {/* Configuration for the Selected Category & Assessment Summary */}
            <div className="config-grid">
              
              {/* Left Column: Specific Settings for the Chosen Category */}
              <div className="config-card glass-panel">
                {selectedCategory === 'chapter_wise' && (
                  <>
                    <h3 className="config-section-title">
                      <span className="section-num">1</span> Chapter Wise Settings
                    </h3>
                    <p className="config-hint">Select which chapter you want to attend for this test.</p>
                    
                    <div className="chapter-picker-grid">
                      {chapterList.map(ch => {
                        const isSelected = selectedChapter === ch;
                        return (
                          <div
                            key={ch}
                            className={`chapter-option-chip ${isSelected ? 'active' : ''}`}
                            onClick={() => setSelectedChapter(ch)}
                          >
                            <div className="chip-top">
                              <span className="chip-title">
                                <span className="chip-radio-icon">{isSelected ? '◉' : '○'}</span> 📖 {ch}
                              </span>
                              <span className="chip-badge">{chapterCounts[ch]} Qs</span>
                            </div>
                            <span className="chip-desc">
                              {isSelected ? '✓ Selected chapter to attend' : 'Click to attend this chapter'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}

                {selectedCategory === 'question_volume' && (
                  <>
                    <h3 className="config-section-title">
                      <span className="section-num">2</span> Question Volume Settings
                    </h3>
                    <p className="config-hint">Choose how many questions to attend from the question bank.</p>
                    
                    <div className="volume-selection-row">
                      <div
                        className={`volume-card ${volumeType === 'full' ? 'active' : ''}`}
                        onClick={() => setVolumeType('full')}
                      >
                        <div className="volume-radio-indicator">
                          {volumeType === 'full' ? '◉' : '○'}
                        </div>
                        <div className="volume-content">
                          <strong>Full Questions (100%)</strong>
                          <span>Attend all {allQuestions.length} available questions</span>
                        </div>
                        <span className="volume-stat-pill">{allQuestions.length} Qs</span>
                      </div>

                      <div
                        className={`volume-card ${volumeType === 'half' ? 'active' : ''}`}
                        onClick={() => setVolumeType('half')}
                      >
                        <div className="volume-radio-indicator">
                          {volumeType === 'half' ? '◉' : '○'}
                        </div>
                        <div className="volume-content">
                          <strong>Half Questions (50%)</strong>
                          <span>Attend a 50% sample ({Math.max(1, Math.ceil(allQuestions.length / 2))} questions)</span>
                        </div>
                        <span className="volume-stat-pill">
                          {Math.max(1, Math.ceil(allQuestions.length / 2))} Qs
                        </span>
                      </div>

                      {allQuestions.length >= 10 && (
                        <div
                          className={`volume-card ${volumeType === 10 ? 'active' : ''}`}
                          onClick={() => setVolumeType(10)}
                        >
                          <div className="volume-radio-indicator">
                            {volumeType === 10 ? '◉' : '○'}
                          </div>
                          <div className="volume-content">
                            <strong>Quick 10 Questions</strong>
                            <span>Attend 10 random questions</span>
                          </div>
                          <span className="volume-stat-pill">10 Qs</span>
                        </div>
                      )}
                    </div>
                  </>
                )}

                {selectedCategory === 'time_duration' && (
                  <>
                    <h3 className="config-section-title">
                      <span className="section-num">3</span> Time and Exam Duration Settings (Max 2hr)
                    </h3>
                    <p className="config-hint">Set countdown timer up to 2 hours (120 mins). Test auto-submits at 00:00. Zero unlimited time option.</p>

                    {/* Duration Presets up to 2 Hours */}
                    <div className="timed-options-box">
                      <label className="input-sub-label">Select Total Test Duration:</label>
                      <div className="duration-preset-group">
                        {[
                          { label: '15 Mins', mins: 15 },
                          { label: '30 Mins', mins: 30 },
                          { label: '45 Mins', mins: 45 },
                          { label: '1 Hour', mins: 60 },
                          { label: '1.5 Hours', mins: 90 },
                          { label: '2 Hours (Max)', mins: 120 }
                        ].map(({ label, mins }) => (
                          <button
                            key={mins}
                            type="button"
                            className={`btn-duration-chip ${timeDurationMins === mins ? 'active' : ''}`}
                            onClick={() => setTimeDurationMins(mins)}
                          >
                            {label}
                          </button>
                        ))}
                      </div>

                      <div className="custom-duration-row">
                        <span className="text-subtle">Or custom minutes (max 120):</span>
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={timeDurationMins}
                          onChange={(e) => setTimeDurationMins(Math.min(120, Math.max(1, Number(e.target.value))))}
                          className="custom-mins-input"
                        />
                        <span className="text-subtle">minutes (max 2 hr)</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Right Column: Assessment Summary & Launch for Chosen Category */}
              <div className="config-card glass-panel">
                <h3 className="config-section-title">
                  📋 Assessment Summary
                </h3>
                <p className="config-hint">Review parameters for your selected category.</p>

                <div className="test-summary-preview">
                  <div className="summary-row">
                    <span>Selected Category:</span>
                    <strong>{activeAssessment.label}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Category Specification:</span>
                    <strong>{activeAssessment.detail}</strong>
                  </div>
                  <div className="summary-row">
                    <span>Total Questions:</span>
                    <strong>{activeAssessment.count} Questions</strong>
                  </div>
                  <div className="summary-row">
                    <span>Timing Mode:</span>
                    <strong>
                      {activeAssessment.hasCountdown
                        ? `${activeAssessment.duration} Minutes (Strict Countdown, Max 2hr)`
                        : 'Self-Paced (No countdown timer)'}
                    </strong>
                  </div>
                  <div className="summary-row">
                    <span>Attempts Allowance:</span>
                    <strong style={{ color: remainingAttempts > 0 ? '#34d399' : '#f87171' }}>
                      🎫 {remainingAttempts} of {allowedAttempts} Left
                    </strong>
                  </div>
                </div>

                <div className="randomize-toggle-row">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={randomizeOrder}
                      onChange={(e) => setRandomizeOrder(e.target.checked)}
                    />
                    <span>🔀 Shuffle question order randomly</span>
                  </label>
                </div>

                {remainingAttempts <= 0 && (
                  <div className="alert-box alert-error" style={{ margin: '0.5rem 0', fontSize: '0.85rem' }}>
                    <span className="alert-icon">⛔</span>
                    <span>No test attempts remaining. Please ask your administrator to grant more test attempts.</span>
                  </div>
                )}

                <button
                  className="btn btn-primary btn-launch-test"
                  onClick={handleStartTest}
                  disabled={activeAssessment.count === 0 || remainingAttempts <= 0 || startingTest}
                >
                  {startingTest
                    ? '⏳ Starting Assessment...'
                    : remainingAttempts > 0
                    ? `🚀 Begin ${activeAssessment.label} Test (${activeAssessment.count} Qs)`
                    : '⛔ No Test Attempts Remaining'}
                </button>
              </div>

            </div>
          </>
        )}
      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 2: ACTIVE QUIZ TAKING ARENA
  // ----------------------------------------------------
  if (screen === 'active' && currentQ) {
    const answeredCount = Object.keys(userAnswers).length;
    const unansweredCount = quizQuestions.length - answeredCount;
    const isTimerWarning = timeLeftSeconds < 60;

    return (
      <div className="active-quiz-arena">
        {restoredSessionNotice && (
          <div className="alert-box alert-success" style={{ margin: '0.75rem 1.5rem', borderRadius: '10px' }}>
            <span className="alert-icon">🔄</span>
            <span><strong>Assessment Resumed:</strong> You were returned to where you left off. No additional test attempt was deducted!</span>
          </div>
        )}
        
        {/* Sticky Top Bar */}
        <div className="quiz-top-bar glass-panel">
          <div className="quiz-scope-badge">
            <span className="scope-icon">📖</span>
            <span className="scope-name">{currentQ.chapter || 'General'}</span>
          </div>

          <div className="quiz-progress-text">
            Question <strong>{currentIndex + 1}</strong> of <strong>{quizQuestions.length}</strong>
          </div>

          {/* Timer Display: Countdown ONLY for time_duration, Elapsed/Self-Paced for others */}
          <div className="quiz-timer-area">
            {selectedCategory === 'time_duration' ? (
              <div className={`timer-pill ${isTimerWarning ? 'timer-warning' : ''}`} title="Remaining Time (Strict Countdown)">
                <span className="timer-icon">⏳</span>
                <span className="timer-digits">{formatTime(timeLeftSeconds)}</span>
              </div>
            ) : (
              <div className="timer-pill untimed-pill" title="Time Elapsed (Self-Paced Test - No Countdown)">
                <span className="timer-icon">⏱️</span>
                <span className="timer-digits">{formatTime(totalTimeSpentSeconds)}</span>
                <span className="timer-sub-tag">Elapsed</span>
              </div>
            )}
          </div>

          <button
            className="btn btn-submit-quiz"
            onClick={() => setShowSubmitModal(true)}
          >
            Finish & Submit
          </button>
        </div>

        {/* Main Quiz Body */}
        <div className="quiz-body-layout">
          
          {/* Question Card */}
          <div className="question-display-panel glass-panel">
            <div className="question-header-row">
              <span className="q-number-chip">Question #{currentIndex + 1}</span>
              <button
                type="button"
                className={`btn-flag ${isCurrentFlagged ? 'flagged' : ''}`}
                onClick={handleToggleFlag}
              >
                {isCurrentFlagged ? '🚩 Flagged for Review' : '🏳️ Flag for Review'}
              </button>
            </div>

            <h3 className="question-prompt-text">{currentQ.prompt}</h3>

            {/* Optional Code Snippet */}
            {currentQ.code && (
              <pre className="quiz-code-block">
                <code>{currentQ.code}</code>
              </pre>
            )}

            {/* MCQ Options A, B, C, D */}
            <div className="quiz-options-list">
              {currentQ.options.map((optionText, idx) => {
                const isSelected = currentAnswer === idx;
                const optionLetter = String.fromCharCode(65 + idx);

                return (
                  <div
                    key={idx}
                    className={`quiz-option-card ${isSelected ? 'selected' : ''}`}
                    onClick={() => handleSelectOption(idx)}
                  >
                    <div className="option-letter-badge">{optionLetter}</div>
                    <span className="option-text-content">{optionText}</span>
                    <div className="option-radio-dot">
                      {isSelected && <div className="inner-dot"></div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Action Bar Below Question */}
            <div className="question-nav-bar">
              <button
                className="btn btn-secondary"
                onClick={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
                disabled={currentIndex === 0}
              >
                ← Previous
              </button>

              <button
                className="btn btn-outline-subtle"
                onClick={handleClearAnswer}
                disabled={currentAnswer === undefined}
              >
                Clear Selection
              </button>

              {currentIndex < quizQuestions.length - 1 ? (
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentIndex(prev => Math.min(quizQuestions.length - 1, prev + 1))}
                >
                  Next →
                </button>
              ) : (
                <button
                  className="btn btn-submit-primary"
                  onClick={() => setShowSubmitModal(true)}
                >
                  Review & Submit
                </button>
              )}
            </div>
          </div>

          {/* Right/Bottom Question Palette */}
          <div className="quiz-palette-panel glass-panel">
            <h4>Question Palette</h4>
            <div className="palette-stats-summary">
              <span className="p-stat stat-ans">✓ {answeredCount} Answered</span>
              <span className="p-stat stat-unans">○ {unansweredCount} Left</span>
              {flaggedQuestions.size > 0 && (
                <span className="p-stat stat-flag">🚩 {flaggedQuestions.size} Flagged</span>
              )}
            </div>

            <div className="palette-grid">
              {quizQuestions.map((q, idx) => {
                const isAns = userAnswers[q.id] !== undefined;
                const isFlag = flaggedQuestions.has(q.id);
                const isCur = idx === currentIndex;

                let stateClass = 'unanswered';
                if (isAns) stateClass = 'answered';
                if (isFlag) stateClass += ' flagged';
                if (isCur) stateClass += ' current';

                return (
                  <button
                    key={q.id}
                    type="button"
                    className={`palette-number-btn ${stateClass}`}
                    onClick={() => setCurrentIndex(idx)}
                    title={`Jump to Question ${idx + 1}`}
                  >
                    {idx + 1}
                    {isFlag && <span className="mini-flag-dot"></span>}
                  </button>
                );
              })}
            </div>

            <div className="palette-legend">
              <div className="legend-item"><span className="legend-dot dot-ans"></span> Answered</div>
              <div className="legend-item"><span className="legend-dot dot-unans"></span> Unanswered</div>
              <div className="legend-item"><span className="legend-dot dot-flag"></span> Flagged</div>
            </div>
          </div>

        </div>

        {/* Submit Confirmation Modal */}
        {showSubmitModal && (
          <div className="modal-overlay">
            <div className="modal-dialog glass-panel">
              <h3>Submit Your Assessment?</h3>
              <p>Are you sure you want to finish and submit your test?</p>

              <div className="submit-summary-grid">
                <div className="sub-stat-box green">
                  <span className="num">{answeredCount}</span>
                  <span className="lbl">Answered</span>
                </div>
                <div className="sub-stat-box amber">
                  <span className="num">{unansweredCount}</span>
                  <span className="lbl">Unanswered</span>
                </div>
                <div className="sub-stat-box purple">
                  <span className="num">{flaggedQuestions.size}</span>
                  <span className="lbl">Flagged for Review</span>
                </div>
              </div>

              {unansweredCount > 0 && (
                <div className="modal-alert-warning">
                  ⚠️ You still have <strong>{unansweredCount} unanswered questions</strong>. Submitting now will grade them as incorrect.
                </div>
              )}

              <div className="modal-actions-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowSubmitModal(false)}
                >
                  Return to Test
                </button>
                <button
                  type="button"
                  className="btn btn-submit-confirm"
                  onClick={handleSubmitTest}
                >
                  Yes, Submit Now
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  // ----------------------------------------------------
  // VIEW 3: SCORECARD & DETAILED EXPLANATION REVIEW
  // ----------------------------------------------------
  if (screen === 'review') {
    const { total, correctCount, incorrectCount, unansweredCount, percentage } = results;

    const filteredReviewQuestions = quizQuestions.filter(q => {
      const chosen = userAnswers[q.id];
      const isCorrect = chosen !== undefined && Number(chosen) === Number(q.correct_index);
      if (reviewFilter === 'correct') return isCorrect;
      if (reviewFilter === 'incorrect') return !isCorrect;
      return true;
    });

    return (
      <div className="quiz-review-view">
        
        {timeExpiredAlert && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
            <span className="alert-icon">⏱️</span>
            <span><strong>Time Expired!</strong> The assessment timer finished, and your answers have been auto-submitted.</span>
          </div>
        )}

        {/* Scorecard Hero Panel */}
        <div className="scorecard-hero glass-panel">
          <div className="score-main-display">
            <div className="score-percentage-circle">
              <span className="percentage-number">{percentage}%</span>
              <span className="percentage-label">Accuracy Score</span>
            </div>
            <div className="score-headline">
              <h2>
                {percentage >= 80 ? '🎉 Outstanding Performance!' : percentage >= 50 ? '👍 Good Effort!' : '📚 Needs Practice'}
              </h2>
              <p className="score-sub">
                You correctly answered <strong>{correctCount}</strong> out of <strong>{total}</strong> questions in {formatTime(totalTimeSpentSeconds)}.
              </p>
            </div>
          </div>

          <div className="scorecard-stats-row">
            <div className="score-stat-tile tile-green">
              <span className="tile-icon">✓</span>
              <div>
                <span className="tile-value">{correctCount}</span>
                <span className="tile-title">Correct</span>
              </div>
            </div>

            <div className="score-stat-tile tile-red">
              <span className="tile-icon">✕</span>
              <div>
                <span className="tile-value">{incorrectCount}</span>
                <span className="tile-title">Incorrect</span>
              </div>
            </div>

            <div className="score-stat-tile tile-gray">
              <span className="tile-icon">○</span>
              <div>
                <span className="tile-value">{unansweredCount}</span>
                <span className="tile-title">Unanswered</span>
              </div>
            </div>

            <div className="score-stat-tile tile-blue">
              <span className="tile-icon">⏱️</span>
              <div>
                <span className="tile-value">{formatTime(totalTimeSpentSeconds)}</span>
                <span className="tile-title">Time Spent</span>
              </div>
            </div>
          </div>

          {/* Clean Action Buttons without Back to Profile */}
          <div className="scorecard-actions-bar">
            <button className="btn btn-primary" onClick={handleStartTest}>
              🔄 Retake This Test
            </button>
            <button className="btn btn-secondary" onClick={() => { clearActiveSession(); setScreen('config'); }}>
              ⚙️ Configure New Test
            </button>
          </div>
        </div>

        {/* Detailed Solutions & Explanations Review */}
        <div className="review-solutions-section">
          <div className="solutions-header-row">
            <div>
              <h3>Detailed Question-by-Question Review</h3>
              <p className="text-subtle">Review correct answers along with author explanations.</p>
            </div>

            {/* Filter Chips */}
            <div className="filter-chips-group">
              <button
                className={`filter-chip ${reviewFilter === 'all' ? 'active' : ''}`}
                onClick={() => setReviewFilter('all')}
              >
                All ({quizQuestions.length})
              </button>
              <button
                className={`filter-chip ${reviewFilter === 'incorrect' ? 'active chip-red' : ''}`}
                onClick={() => setReviewFilter('incorrect')}
              >
                Incorrect / Skipped ({incorrectCount + unansweredCount})
              </button>
              <button
                className={`filter-chip ${reviewFilter === 'correct' ? 'active chip-green' : ''}`}
                onClick={() => setReviewFilter('correct')}
              >
                Correct ({correctCount})
              </button>
            </div>
          </div>

          <div className="review-cards-list">
            {filteredReviewQuestions.map((q, idx) => {
              const chosen = userAnswers[q.id];
              const isCorrect = chosen !== undefined && Number(chosen) === Number(q.correct_index);
              const originalIndex = quizQuestions.findIndex(item => item.id === q.id);

              return (
                <div
                  key={q.id}
                  className={`review-question-card glass-panel ${isCorrect ? 'border-correct' : 'border-incorrect'}`}
                >
                  <div className="review-card-header">
                    <div className="r-left">
                      <span className="q-badge">Question #{originalIndex + 1}</span>
                      <span className="ch-badge">{q.chapter || 'General'}</span>
                    </div>

                    <div className="r-right">
                      {chosen === undefined ? (
                        <span className="status-tag status-skipped">○ Skipped</span>
                      ) : isCorrect ? (
                        <span className="status-tag status-correct">✓ Correct (+1)</span>
                      ) : (
                        <span className="status-tag status-wrong">✕ Incorrect</span>
                      )}
                    </div>
                  </div>

                  <h4 className="review-prompt">{q.prompt}</h4>

                  {q.code && (
                    <pre className="quiz-code-block">
                      <code>{q.code}</code>
                    </pre>
                  )}

                  {/* Options with Visual Correct/Incorrect Annotations */}
                  <div className="review-options-grid">
                    {q.options.map((opt, oIdx) => {
                      const isChosen = chosen === oIdx;
                      const isRealCorrect = Number(q.correct_index) === oIdx;

                      let optClass = 'opt-neutral';
                      if (isRealCorrect) optClass = 'opt-correct';
                      else if (isChosen && !isRealCorrect) optClass = 'opt-wrong';

                      return (
                        <div key={oIdx} className={`review-opt-pill ${optClass}`}>
                          <span className="pill-letter">{String.fromCharCode(65 + oIdx)}</span>
                          <span className="pill-text">{opt}</span>
                          {isRealCorrect && <span className="pill-badge pill-badge-green">✓ Correct Answer</span>}
                          {isChosen && !isRealCorrect && <span className="pill-badge pill-badge-red">✕ Your Choice</span>}
                          {isChosen && isRealCorrect && <span className="pill-badge pill-badge-green">✓ Your Choice</span>}
                        </div>
                      );
                    })}
                  </div>

                  {/* Author Explanation */}
                  {q.explanation && (
                    <div className="review-explanation-box">
                      <div className="explanation-header">
                        <span className="exp-icon">💡</span>
                        <strong>Explanation</strong>
                      </div>
                      <p>{q.explanation}</p>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>

      </div>
    );
  }

  return null;
}
