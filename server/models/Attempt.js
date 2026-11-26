import mongoose from 'mongoose';
import question from './questionDefinition.js';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    paper: { type: mongoose.Schema.Types.ObjectId, ref: 'Paper', required: true },
    title: String,
    examName: String,
    subject: String,
    mode: String,
    duration: Number,
    // Snapshot, so editing a paper never changes past results
    questions: [question],
    answers: { type: mongoose.Schema.Types.Mixed, default: {} },
    marked: [String],
    current: { type: Number, default: 0 },
    revision: { type: Number, default: 0 },
    status: { type: String, enum: ['in_progress', 'evaluating', 'submitted'], default: 'in_progress' },
    startedAt: Date,
    deadline: Date,
    submittedAt: Date,
    evaluatingAt: Date,
    result: mongoose.Schema.Types.Mixed,
  },
  { timestamps: true, minimize: false }
);
// At most one running attempt per user and paper
schema.index({ user: 1, paper: 1 }, { unique: true, partialFilterExpression: { status: 'in_progress' } });
export default mongoose.model('Attempt', schema);
