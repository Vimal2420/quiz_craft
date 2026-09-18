import express from 'express';
import Attempt from '../models/Attempt.js';
import User from '../models/User.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/attempts/start - Decrement remaining attempts immediately when student starts test
router.post('/start', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    if (user.role === 'user') {
      const remaining = user.remainingAttempts !== undefined ? user.remainingAttempts : 3;
      if (remaining <= 0) {
        return res.status(403).json({
          message: 'You have exhausted all allowed test attempts. Please contact your administrator to grant more attempts.'
        });
      }

      // Decrement attempts count immediately upon start
      user.remainingAttempts = Math.max(0, remaining - 1);
      await user.save();
    }

    return res.json({
      success: true,
      message: 'Test started. One attempt has been counted.',
      remainingAttempts: user.remainingAttempts,
      allowedAttempts: user.allowedAttempts
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to start test attempt.', error: err.message });
  }
});

// POST /api/attempts - Record test score (attempt already counted when test started)
router.post('/', verifyToken, async (req, res) => {
  try {
    const { chapter, score, totalQuestions, percentage, timeSpentSeconds, answers } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const attempt = new Attempt({
      userId: req.user._id,
      userName: req.user.name,
      chapter: chapter || 'All Chapters',
      score: Number(score),
      totalQuestions: Number(totalQuestions),
      percentage: Number(percentage),
      timeSpentSeconds: Number(timeSpentSeconds || 0),
      answers: answers || {}
    });

    await attempt.save();

    return res.status(201).json({
      success: true,
      message: 'Assessment score saved successfully.',
      attempt,
      remainingAttempts: user.remainingAttempts,
      allowedAttempts: user.allowedAttempts
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to record attempt.', error: err.message });
  }
});

// GET /api/attempts/my - Get current user attempts
router.get('/my', verifyToken, async (req, res) => {
  try {
    const attempts = await Attempt.find({ userId: req.user._id }).sort({ createdAt: -1 });
    return res.json({ success: true, attempts });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch attempts.', error: err.message });
  }
});

// GET /api/attempts/leaderboard - Top candidates ranking
router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const leaderboard = await Attempt.aggregate([
      {
        $group: {
          _id: '$userId',
          fallbackName: { $first: '$userName' },
          totalAttempts: { $sum: 1 },
          avgPercentage: { $avg: '$percentage' },
          bestScore: { $max: '$percentage' },
          totalScore: { $sum: '$score' },
          totalQuestions: { $sum: '$totalQuestions' },
          lastAttemptDate: { $max: '$createdAt' }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'userDetails'
        }
      },
      {
        $unwind: {
          path: '$userDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { avgPercentage: -1, bestScore: -1, totalAttempts: -1 }
      },
      {
        $limit: 25
      }
    ]);

    const formatted = leaderboard.map((entry, index) => ({
      rank: index + 1,
      userId: entry._id.toString(),
      userName: entry.userDetails?.name || entry.fallbackName || 'Candidate',
      email: entry.userDetails?.email ? `${entry.userDetails.email.split('@')[0]}***@...` : '',
      totalAttempts: entry.totalAttempts,
      avgPercentage: Math.round(entry.avgPercentage || 0),
      bestScore: Math.round(entry.bestScore || 0),
      totalScore: entry.totalScore,
      totalQuestions: entry.totalQuestions,
      lastAttemptDate: entry.lastAttemptDate
    }));

    return res.json({ success: true, leaderboard: formatted });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch leaderboard.', error: err.message });
  }
});

export default router;
