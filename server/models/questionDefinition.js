import mongoose from 'mongoose';
export default new mongoose.Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ['mcq', 'msq', 'numerical', 'truefalse', 'short'], required: true },
    text: { type: String, required: true },
    options: [String],
    correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
    explanation: String,
    rubric: [{ _id: false, point: String, weight: Number }],
    topic: String,
    difficulty: String,
    marks: { type: Number, required: true },
    negativeMarks: { type: Number, default: 0 },
    sourceQuote: String,
    edited: { type: Boolean, default: false },
  },
  { _id: false, id: false }
);
