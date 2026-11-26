import mongoose from 'mongoose';
const schema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    filename: { type: String, required: true },
    size: Number,
    charCount: Number,
    truncated: Boolean,
    text: { type: String, required: true, select: false },
  },
  { timestamps: true }
);
export default mongoose.model('Material', schema);
