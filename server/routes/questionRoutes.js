import express from 'express';
import Question from '../models/Question.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Helper to format question for frontend compatibility
const formatQuestion = (q) => ({
  id: q._id.toString(),
  _id: q._id.toString(),
  chapter: q.chapter || 'General',
  prompt: q.prompt,
  code: q.code || null,
  options: q.options,
  correct_index: q.correctIndex,
  correctIndex: q.correctIndex,
  explanation: q.explanation || '',
  created_at: q.createdAt,
  createdAt: q.createdAt
});

// GET /api/questions - Get all questions (or by chapter)
router.get('/', async (req, res) => {
  try {
    const { chapter } = req.query;
    const filter = {};
    if (chapter && chapter !== 'all') {
      filter.chapter = chapter;
    }

    const questions = await Question.find(filter).sort({ createdAt: -1 });
    return res.json({
      success: true,
      questions: questions.map(formatQuestion)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch questions.', error: err.message });
  }
});

// POST /api/questions - Admin add MCQ question
router.post('/', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { chapter, prompt, code, options, correctIndex, correct_index, explanation } = req.body;

    const idx = correctIndex !== undefined ? correctIndex : correct_index;

    if (!prompt || !options || options.length < 2 || idx === undefined) {
      return res.status(400).json({ message: 'Prompt, at least 2 options, and a correctIndex are required.' });
    }

    const newQuestion = new Question({
      chapter: chapter && chapter.trim() ? chapter.trim() : 'General',
      prompt: prompt.trim(),
      code: code && code.trim() ? code.trim() : null,
      options: options.map(o => o.trim()),
      correctIndex: Number(idx),
      explanation: explanation ? explanation.trim() : ''
    });

    await newQuestion.save();

    return res.status(201).json({
      success: true,
      question: formatQuestion(newQuestion)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to create question.', error: err.message });
  }
});

// PUT /api/questions/:id - Admin update MCQ question
router.put('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const { chapter, prompt, code, options, correctIndex, correct_index, explanation } = req.body;
    const idx = correctIndex !== undefined ? correctIndex : correct_index;

    const question = await Question.findById(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    if (chapter !== undefined) question.chapter = chapter.trim() || 'General';
    if (prompt !== undefined) question.prompt = prompt.trim();
    if (code !== undefined) question.code = code ? code.trim() : null;
    if (options !== undefined) question.options = options.map(o => o.trim());
    if (idx !== undefined) question.correctIndex = Number(idx);
    if (explanation !== undefined) question.explanation = explanation ? explanation.trim() : '';

    await question.save();

    return res.json({
      success: true,
      question: formatQuestion(question)
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update question.', error: err.message });
  }
});

// DELETE /api/questions/:id - Admin delete MCQ question
router.delete('/:id', verifyToken, requireAdmin, async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);
    if (!question) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    return res.json({
      success: true,
      message: 'Question deleted successfully.',
      id: req.params.id
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to delete question.', error: err.message });
  }
});

export default router;
