import express from 'express';
import User from '../models/User.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Apply auth & admin check to all admin routes
router.use(verifyToken, requireAdmin);

// GET /api/admin/users - List all users
router.get('/users', async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    const sanitized = users.map(u => ({
      id: u._id,
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      status: u.status,
      allowedAttempts: u.allowedAttempts ?? 3,
      remainingAttempts: u.remainingAttempts ?? (u.allowedAttempts ?? 3),
      createdAt: u.createdAt
    }));
    return res.json({ success: true, users: sanitized });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to fetch users.', error: err.message });
  }
});

// PUT /api/admin/users/:id/approve - Approve pending candidate with allowed test attempts
router.put('/users/:id/approve', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const attempts = Number(req.body.allowedAttempts) > 0 ? Number(req.body.allowedAttempts) : 3;

    user.status = 'approved';
    user.allowedAttempts = attempts;
    user.remainingAttempts = attempts;
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.name} approved with ${attempts} allowed test attempts.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        allowedAttempts: user.allowedAttempts,
        remainingAttempts: user.remainingAttempts
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to approve user.', error: err.message });
  }
});

// PUT /api/admin/users/:id/attempts - Grant/adjust test attempts
router.put('/users/:id/attempts', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const { allowedAttempts, remainingAttempts } = req.body;
    if (allowedAttempts !== undefined) user.allowedAttempts = Math.max(0, Number(allowedAttempts));
    if (remainingAttempts !== undefined) user.remainingAttempts = Math.max(0, Number(remainingAttempts));
    await user.save();

    return res.json({
      success: true,
      message: `Updated test attempts for ${user.name}: ${user.remainingAttempts} remaining of ${user.allowedAttempts} total.`,
      user: {
        id: user._id,
        name: user.name,
        allowedAttempts: user.allowedAttempts,
        remainingAttempts: user.remainingAttempts
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to update attempts.', error: err.message });
  }
});

// PUT /api/admin/users/:id/reject - Reject candidate
router.put('/users/:id/reject', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.status = 'rejected';
    await user.save();

    return res.json({
      success: true,
      message: `User ${user.name} registration request was rejected.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Failed to reject user.', error: err.message });
  }
});

export default router;
