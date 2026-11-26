import mongoose from 'mongoose';
import question from './questionDefinition.js';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true },
    mode: { type: String, enum: ['ai', 'demo'], required: true },
    examType: String,
    examName: String,
    subject: String,
    topic: String,
    difficulty: String,
    questionCount: Number,
    duration: Number,
    questionTypes: [String],
    marksPerQuestion: Number,
    negativeMarks: Number,
    negativeTypes: [String],
    materialIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Material' }],
    questions: [question],
  },
  { timestamps: true, optimisticConcurrency: true }
);
export default mongoose.model('Paper', schema);
