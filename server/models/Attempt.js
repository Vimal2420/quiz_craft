import mongoose from 'mongoose';

const attemptSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  chapter: {
    type: String,
    required: true,
    default: 'All Chapters'
  },
  score: {
    type: Number,
    required: true
  },
  totalQuestions: {
    type: Number,
    required: true
  },
  percentage: {
    type: Number,
    required: true
  },
  timeSpentSeconds: {
    type: Number,
    default: 0
  },
  answers: {
    type: Map,
    of: Number,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Attempt = mongoose.model('Attempt', attemptSchema);
export default Attempt;
