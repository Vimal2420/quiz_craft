import express from 'express';
import User from '../models/User.js';
import { generateToken, verifyToken } from '../middleware/auth.js';

const router = express.Router();

// POST /api/auth/register (Normal User registration -> pending approval)
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'Name, email, phone number, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const newUser = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      password,
      role: 'user',
      status: 'pending'
    });

    await newUser.save();

    return res.status(201).json({
      success: true,
      pendingApproval: true,
      message: 'Registration request submitted! Your account has been forwarded to the Admin Portal for approval.'
    });
  } catch (err) {
    return res.status(500).json({ message: 'Registration failed.', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Role check if expected
    if (expectedRole && user.role !== expectedRole) {
      return res.status(403).json({
        message: `This account is registered as ${user.role.toUpperCase()}. Please use the ${user.role === 'admin' ? 'Admin Login' : 'Normal User'} tab.`
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Check approval status
    if (user.role === 'user' && user.status === 'pending') {
      return res.status(403).json({
        pendingApproval: true,
        message: 'Your account is pending administrator approval. Once an administrator approves your registration, you can log in.'
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        message: 'Your registration request was rejected by an administrator.'
      });
    }

    const token = generateToken(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        allowedAttempts: user.allowedAttempts ?? 3,
        remainingAttempts: user.remainingAttempts ?? (user.allowedAttempts ?? 3)
      }
    });
  } catch (err) {
    return res.status(500).json({ message: 'Login failed.', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', verifyToken, async (req, res) => {
  return res.json({
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone || '',
      role: req.user.role,
      status: req.user.status,
      allowedAttempts: req.user.allowedAttempts ?? 3,
      remainingAttempts: req.user.remainingAttempts ?? (req.user.allowedAttempts ?? 3)
    }
  });
});

export default router;
