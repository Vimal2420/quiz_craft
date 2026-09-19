import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes.js';
import questionRoutes from './routes/questionRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import attemptRoutes from './routes/attemptRoutes.js';
import User from './models/User.js';

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config(); // Also check root .env if any

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/quizcraft';

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attempts', attemptRoutes);

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend static build files in production
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA fallback: any non-API GET request loads index.html
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(distPath, 'index.html'));
});

// Auto-seed Administrator Account if not present
const seedAdminAccount = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const defaultAdmin = new User({
        name: 'Administrator',
        email: 'admin@quizcraft.io',
        password: 'admin123',
        role: 'admin',
        status: 'approved'
      });
      await defaultAdmin.save();
      console.log('✅ Default Administrator seeded: admin@quizcraft.io / admin123');
    } else {
      console.log(`ℹ️ Admin account already present: ${adminExists.email}`);
    }
  } catch (err) {
    console.warn('Notice during admin seeding:', err.message);
  }
};

// Start Server & Connect Database
app.listen(PORT, () => {
  console.log(`🚀 QuizCraft Node/Express Backend running on http://localhost:${PORT}`);
});

const connectDB = async () => {
  if (!MONGODB_URI || MONGODB_URI.includes('<username>') || MONGODB_URI.includes('<password>')) {
    console.log('⚠️ MongoDB Atlas URI has placeholders in server/.env.');
    console.log('👉 Please replace <username> and <password> in server/.env with your real MongoDB Atlas credentials.');
    return;
  }

  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
    console.log('🟢 Connected to MongoDB Atlas database successfully!');
    await seedAdminAccount();
  } catch (err) {
    console.warn(`⏳ Waiting for Atlas cluster to finish initializing (${err.message}). Retrying in 8s...`);
    setTimeout(connectDB, 8000);
  }
};

connectDB();
