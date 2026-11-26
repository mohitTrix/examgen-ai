import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: ['student', 'teacher'], default: 'student' },
    institution: { type: String, default: '', maxlength: 150 },
    preferences: {
      defaultDifficulty: { type: String, enum: ['easy', 'medium', 'hard', 'mixed'], default: 'mixed' },
      defaultExam: { type: String, enum: ['GATE', 'JEE', 'NEET', 'UPSC', 'University', 'Custom'], default: 'Custom' },
    },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export default mongoose.model('User', schema);
