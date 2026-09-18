import React, { useState, useEffect } from 'react';
import { QuestionsStore } from '../lib/questionsStore';

export default function AdminQuestionManager() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedChapterFilter, setSelectedChapterFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [notice, setNotice] = useState('');
  const [expandedQuestionIds, setExpandedQuestionIds] = useState(new Set()); // Collapsed by default

  const toggleExpand = (id) => {
    setExpandedQuestionIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState(null);

  // Form State
  const [chapter, setChapter] = useState('');
  const [customChapter, setCustomChapter] = useState('');
  const [isCreatingNewChapter, setIsCreatingNewChapter] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [opt0, setOpt0] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');
  const [correctIndex, setCorrectIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [formError, setFormError] = useState('');

  // Load questions
  const loadQuestions = async () => {
    setLoading(true);
    const data = await QuestionsStore.getQuestions();
    setQuestions(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  // Extract unique chapters
  const existingChapters = Array.from(new Set(questions.map(q => q.chapter).filter(Boolean)));

  // Open Modal for New Question
  const handleOpenAddModal = () => {
    setEditingQuestionId(null);
    setChapter(existingChapters[0] || 'Chapter 1: Introduction');
    setCustomChapter('');
    setIsCreatingNewChapter(existingChapters.length === 0);
    setPrompt('');
    setCode('');
    setOpt0('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
    setCorrectIndex(0);
    setExplanation('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open Modal for Editing Question
  const handleOpenEditModal = (q) => {
    setEditingQuestionId(q.id);
    setChapter(q.chapter || 'Chapter 1: Introduction');
    setCustomChapter('');
    setIsCreatingNewChapter(false);
    setPrompt(q.prompt || '');
    setCode(q.code || '');
    setOpt0(q.options?.[0] || '');
    setOpt1(q.options?.[1] || '');
    setOpt2(q.options?.[2] || '');
    setOpt3(q.options?.[3] || '');
    setCorrectIndex(q.correct_index ?? q.correctIndex ?? 0);
    setExplanation(q.explanation || '');
    setFormError('');
    setIsModalOpen(true);
  };

  // Save Question (Create or Edit)
  const handleSaveQuestion = async (e) => {
    e.preventDefault();
    setFormError('');

    const finalChapter = isCreatingNewChapter ? customChapter.trim() : chapter.trim();

    if (!finalChapter) {
      setFormError('Please specify the Chapter for this question.');
      return;
    }
    if (!prompt.trim()) {
      setFormError('Question prompt cannot be empty.');
      return;
    }
    if (!opt0.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim()) {
      setFormError('All 4 multiple choice options (A, B, C, D) are required.');
      return;
    }

    const payload = {
      chapter: finalChapter,
      prompt,
      code,
      options: [opt0, opt1, opt2, opt3],
      correctIndex,
      explanation
    };

    if (editingQuestionId) {
      await QuestionsStore.updateQuestion(editingQuestionId, payload);
      setNotice('MCQ Question updated successfully!');
    } else {
      await QuestionsStore.addQuestion(payload);
      setNotice(`New MCQ question added to "${finalChapter}"!`);
    }

    setIsModalOpen(false);
    loadQuestions();
    setTimeout(() => setNotice(''), 4000);
  };

  // Delete Confirmation State
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // Execute Delete
  const handleConfirmDelete = async () => {
    if (!questionToDelete) return;
    const targetId = questionToDelete.id;

    // Immediately remove from React state for instant responsiveness
    setQuestions(prev => prev.filter(q => String(q.id) !== String(targetId)));
    setQuestionToDelete(null);
    setNotice('Question deleted successfully.');

    // Remove from Store and Supabase
    await QuestionsStore.deleteQuestion(targetId);
    setTimeout(() => setNotice(''), 3000);
  };

  // Filtered Questions
  const filteredQuestions = questions.filter(q => {
    const matchChapter = selectedChapterFilter === 'ALL' || q.chapter === selectedChapterFilter;
    const matchSearch = !searchQuery ||
      q.prompt.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (q.chapter && q.chapter.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchChapter && matchSearch;
  });

  return (
    <div className="admin-question-manager-section">
      
      {/* Notice message */}
      {notice && (
        <div className="alert-box alert-success" style={{ marginBottom: '1.25rem' }}>
          <span className="alert-icon">✅</span>
          <span>{notice}</span>
        </div>
      )}

      {/* Control Bar */}
      <div className="qm-header-bar">
        <div className="qm-header-title">
          <div className="title-with-badge">
            <h3>Chapter Question Bank</h3>
            <span className="counter-badge badge-indigo">
              {questions.length} Total MCQs
            </span>
          </div>
          <p className="text-subtle">
            All questions are manually authored and organized by syllabus chapters.
          </p>
        </div>

        <button className="btn btn-primary" onClick={handleOpenAddModal}>
          ＋ Add MCQ Question
        </button>
      </div>

      {/* Filters & Search */}
      <div className="qm-filters-bar">
        <div className="qm-chapter-chips">
          <button
            className={`chip-btn ${selectedChapterFilter === 'ALL' ? 'active' : ''}`}
            onClick={() => setSelectedChapterFilter('ALL')}
          >
            📚 All Chapters ({questions.length})
          </button>
          {existingChapters.map(chap => {
            const count = questions.filter(q => q.chapter === chap).length;
            return (
              <button
                key={chap}
                className={`chip-btn ${selectedChapterFilter === chap ? 'active' : ''}`}
                onClick={() => setSelectedChapterFilter(chap)}
              >
                📁 {chap} ({count})
              </button>
            );
          })}
        </div>

        <div className="qm-search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search questions or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Questions Display */}
      {loading ? (
        <div className="qm-loading">
          <div className="spinner"></div>
          <p>Loading question bank...</p>
        </div>
      ) : filteredQuestions.length === 0 ? (
        <div className="empty-questions-card">
          <div className="empty-icon">📝</div>
          <h4>No Questions in this Selection</h4>
          <p>
            {questions.length === 0
              ? 'No questions have been added yet. Click "Add MCQ Question" to manually author your first question for a chapter.'
              : 'No questions match the selected chapter or search filter.'}
          </p>
          <button className="btn btn-primary btn-sm" onClick={handleOpenAddModal} style={{ marginTop: '0.75rem' }}>
            ＋ Create New Question
          </button>
        </div>
      ) : (
        <div className="questions-card-list">
          {filteredQuestions.map((q, idx) => {
            const qKey = q.id || idx;
            const corrIdx = q.correct_index ?? q.correctIndex ?? 0;
            const isExpanded = expandedQuestionIds.has(qKey);

            return (
              <div key={qKey} className="question-item-card">
                
                {/* Header */}
                <div className="q-card-top">
                  <div className="q-meta-info">
                    <span className="chapter-pill">📁 {q.chapter || 'General'}</span>
                    <span className="q-number-tag">Question #{filteredQuestions.length - idx}</span>
                  </div>
                  <div className="q-card-actions">
                    <button
                      className="btn-icon"
                      onClick={() => handleOpenEditModal(q)}
                      title="Edit question"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      className="btn-icon btn-icon-danger"
                      onClick={() => setQuestionToDelete(q)}
                      title="Delete question"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>

                {/* Question Prompt */}
                <div className="q-prompt-text">{q.prompt}</div>

                {/* Code block if present */}
                {q.code && (
                  <pre className="q-code-snippet">
                    <code>{q.code}</code>
                  </pre>
                )}

                {/* Expand / Collapse Options & Answer Toggle */}
                <div className="q-expand-bar">
                  <button
                    type="button"
                    className={`btn-expand-answer ${isExpanded ? 'active' : ''}`}
                    onClick={() => toggleExpand(qKey)}
                  >
                    <span>{isExpanded ? '▲ Hide Options & Answer' : '👁️ Show Options & Correct Answer'}</span>
                  </button>
                </div>

                {/* Collapsible Options and Explanation */}
                {isExpanded && (
                  <div className="q-expanded-content">
                    {/* 4 Options Grid */}
                    <div className="q-options-grid">
                      {q.options && q.options.map((opt, oIdx) => {
                        const isCorrect = oIdx === corrIdx;
                        return (
                          <div key={oIdx} className={`q-opt-pill ${isCorrect ? 'correct-option' : ''}`}>
                            <span className="opt-letter">{String.fromCharCode(65 + oIdx)}</span>
                            <span className="opt-text">{opt}</span>
                            {isCorrect && <span className="opt-badge-correct">✓ Correct</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div className="q-explanation-note">
                        <span className="exp-title">💡 Explanation:</span> {q.explanation}
                      </div>
                    )}
                  </div>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* ====================================================================
          MODAL: ADD / EDIT MCQ QUESTION
          ==================================================================== */}
      {isModalOpen && (
        <div className="modal-backdrop-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content-box" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-box-header">
              <h3>{editingQuestionId ? '✏️ Edit MCQ Question' : '＋ Add New MCQ Question'}</h3>
              <button className="modal-close-btn" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveQuestion} className="modal-form-body">
              {formError && (
                <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
                  <span className="alert-icon">⚠️</span>
                  <span>{formError}</span>
                </div>
              )}

              {/* Chapter Selection */}
              <div className="form-field-row">
                <label>Chapter / Topic *</label>
                {!isCreatingNewChapter && existingChapters.length > 0 ? (
                  <div className="chapter-select-wrapper">
                    <select
                      className="input-select"
                      value={chapter}
                      onChange={(e) => setChapter(e.target.value)}
                    >
                      {existingChapters.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-link-small"
                      onClick={() => {
                        setIsCreatingNewChapter(true);
                        setCustomChapter('');
                      }}
                    >
                      ＋ Type New Chapter
                    </button>
                  </div>
                ) : (
                  <div className="chapter-input-wrapper">
                    <input
                      type="text"
                      className="form-input"
                      placeholder="e.g. Chapter 1: Introduction to Web Dev"
                      value={customChapter}
                      onChange={(e) => setCustomChapter(e.target.value)}
                      required
                    />
                    {existingChapters.length > 0 && (
                      <button
                        type="button"
                        className="btn-link-small"
                        onClick={() => setIsCreatingNewChapter(false)}
                      >
                        ← Choose existing chapter
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Prompt */}
              <div className="form-field-row">
                <label>Question Prompt *</label>
                <textarea
                  className="form-textarea"
                  rows="3"
                  placeholder="Type your multiple choice question here..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  required
                />
              </div>

              {/* Code Snippet (Optional) */}
              <div className="form-field-row">
                <label>Optional Code Snippet <span className="text-subtle">(Leave blank if not applicable)</span></label>
                <textarea
                  className="form-textarea font-mono"
                  rows="2"
                  placeholder="// Paste programming code or snippet here..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              {/* 4 Options */}
              <div className="form-field-row">
                <label>4 Options & Correct Answer Radio *</label>
                <span className="text-subtle" style={{ display: 'block', marginBottom: '0.6rem' }}>
                  Mark the circular radio button next to the correct answer.
                </span>

                <div className="options-input-stack">
                  {/* Option A */}
                  <div className={`opt-input-row ${correctIndex === 0 ? 'opt-active-row' : ''}`}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={correctIndex === 0}
                        onChange={() => setCorrectIndex(0)}
                      />
                      <span className="opt-tag-label">A</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Option A text"
                      value={opt0}
                      onChange={(e) => setOpt0(e.target.value)}
                      required
                    />
                  </div>

                  {/* Option B */}
                  <div className={`opt-input-row ${correctIndex === 1 ? 'opt-active-row' : ''}`}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={correctIndex === 1}
                        onChange={() => setCorrectIndex(1)}
                      />
                      <span className="opt-tag-label">B</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Option B text"
                      value={opt1}
                      onChange={(e) => setOpt1(e.target.value)}
                      required
                    />
                  </div>

                  {/* Option C */}
                  <div className={`opt-input-row ${correctIndex === 2 ? 'opt-active-row' : ''}`}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={correctIndex === 2}
                        onChange={() => setCorrectIndex(2)}
                      />
                      <span className="opt-tag-label">C</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Option C text"
                      value={opt2}
                      onChange={(e) => setOpt2(e.target.value)}
                      required
                    />
                  </div>

                  {/* Option D */}
                  <div className={`opt-input-row ${correctIndex === 3 ? 'opt-active-row' : ''}`}>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="correctOpt"
                        checked={correctIndex === 3}
                        onChange={() => setCorrectIndex(3)}
                      />
                      <span className="opt-tag-label">D</span>
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Option D text"
                      value={opt3}
                      onChange={(e) => setOpt3(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Explanation */}
              <div className="form-field-row">
                <label>Explanation <span className="text-subtle">(Shown to candidates after submitting)</span></label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Explain why this option is correct..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
              </div>

              <div className="modal-box-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingQuestionId ? 'Save Changes' : 'Save Question'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL: DELETE CONFIRMATION
          ==================================================================== */}
      {questionToDelete && (
        <div className="modal-backdrop-overlay" onClick={() => setQuestionToDelete(null)}>
          <div className="modal-content-box" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-box-header">
              <h3>🗑️ Delete Question</h3>
              <button className="modal-close-btn" onClick={() => setQuestionToDelete(null)}>✕</button>
            </div>

            <div style={{ padding: '1.5rem', color: 'var(--text-main)' }}>
              <p style={{ marginBottom: '0.85rem', fontSize: '0.95rem' }}>
                Are you sure you want to delete this MCQ question from <strong>{questionToDelete.chapter}</strong>?
              </p>
              <div style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--bg-card-border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.75rem 1rem',
                fontSize: '0.9rem',
                color: 'var(--text-muted)'
              }}>
                "{questionToDelete.prompt}"
              </div>
            </div>

            <div className="modal-box-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setQuestionToDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                style={{ background: '#f43f5e', color: '#fff', border: 'none' }}
                onClick={handleConfirmDelete}
              >
                Yes, Delete Question
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
