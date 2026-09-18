import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  chapter: {
    type: String,
    required: true,
    trim: true,
    default: 'General'
  },
  prompt: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    default: null,
    trim: true
  },
  options: {
    type: [String],
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length >= 2;
      },
      message: 'A question must have at least 2 options.'
    },
    required: true
  },
  correctIndex: {
    type: Number,
    required: true,
    min: 0
  },
  explanation: {
    type: String,
    default: '',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Question = mongoose.model('Question', questionSchema);
export default Question;
