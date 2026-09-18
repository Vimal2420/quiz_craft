import { ApiClient } from './api';

const LOCAL_STORAGE_KEY = 'qc_admin_manual_questions';

const loadLocalQuestions = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

const saveLocalQuestions = (questions) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(questions));
};

export const QuestionsStore = {
  // Fetch all questions from Node.js / MongoDB backend
  async getQuestions(chapter) {
    const local = loadLocalQuestions();

    try {
      const url = chapter && chapter !== 'all' ? `/api/questions?chapter=${encodeURIComponent(chapter)}` : '/api/questions';
      const res = await ApiClient.get(url);
      if (res && res.questions) {
        saveLocalQuestions(res.questions);
        return res.questions;
      }
    } catch (err) {
      console.warn('Could not fetch questions from Node API, using local backup:', err.message);
    }

    return local;
  },

  // Add a new MCQ question
  async addQuestion({ chapter, prompt, code = null, options, correctIndex, explanation = '' }) {
    const cleanChapter = chapter ? chapter.trim() : 'General';
    const payload = {
      chapter: cleanChapter,
      prompt: prompt.trim(),
      code: code && code.trim() ? code.trim() : null,
      options: options.map(o => o.trim()),
      correctIndex: Number(correctIndex),
      explanation: explanation ? explanation.trim() : ''
    };

    // Optimistically update local store
    const tempId = 'q-' + Date.now();
    const tempQ = { id: tempId, ...payload, createdAt: new Date().toISOString() };
    const current = loadLocalQuestions();
    saveLocalQuestions([tempQ, ...current]);

    try {
      const res = await ApiClient.post('/api/questions', payload);
      if (res && res.question) {
        const synced = [tempQ, ...current].map(q => q.id === tempId ? res.question : q);
        saveLocalQuestions(synced);
        return { success: true, question: res.question };
      }
    } catch (err) {
      console.warn('Backend question save notice (saved to local backup):', err.message);
    }

    return { success: true, question: tempQ };
  },

  // Update an existing MCQ question
  async updateQuestion(id, { chapter, prompt, code = null, options, correctIndex, explanation = '' }) {
    const cleanChapter = chapter ? chapter.trim() : 'General';
    const payload = {
      chapter: cleanChapter,
      prompt: prompt.trim(),
      code: code && code.trim() ? code.trim() : null,
      options: options.map(o => o.trim()),
      correctIndex: Number(correctIndex),
      explanation: explanation ? explanation.trim() : ''
    };

    const current = loadLocalQuestions();
    const updated = current.map(q => String(q.id) === String(id) ? { ...q, ...payload } : q);
    saveLocalQuestions(updated);

    try {
      const res = await ApiClient.put(`/api/questions/${id}`, payload);
      if (res && res.question) {
        return { success: true, question: res.question };
      }
    } catch (err) {
      console.warn('Backend update notice:', err.message);
    }

    return { success: true, question: { id, ...payload } };
  },

  // Delete an MCQ question
  async deleteQuestion(id) {
    const current = loadLocalQuestions();
    const updated = current.filter(q => String(q.id) !== String(id));
    saveLocalQuestions(updated);

    try {
      await ApiClient.delete(`/api/questions/${id}`);
    } catch (err) {
      console.warn('Backend delete notice:', err.message);
    }

    return { success: true };
  }
};
