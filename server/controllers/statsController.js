import Paper from '../models/Paper.js';
import Attempt from '../models/Attempt.js';
import { asyncHandler } from '../utils/httpError.js';
import { round2 } from '../utils/scoring.js';

export const stats = asyncHandler(async (req, res) => {
  const user = req.user._id;
  const [totalPapers, attempts, papers] = await Promise.all([
    Paper.countDocuments({ user }),
    Attempt.find({ user }).sort({ createdAt: -1 }),
    Paper.find({ user }).sort({ createdAt: -1 }).limit(6),
  ]);
  const done = attempts.filter((a) => a.status === 'submitted');
  const activity = [
    ...papers.map((p) => ({ kind: 'generated', id: String(p._id), title: p.title, at: p.createdAt })),
    ...attempts.slice(0, 6).map((a) => ({
      kind: a.status === 'submitted' ? 'completed' : 'started', id: String(a._id), title: a.title,
      at: a.submittedAt || a.startedAt, percentage: a.result?.percentage,
    })),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6);
  res.json({
    totalPapers,
    totalAttempts: attempts.length,
    averageScore: done.length ? round2(done.reduce((s, a) => s + a.result.percentage, 0) / done.length) : null,
    trend: done.slice(0, 10).reverse().map((a) => ({ id: String(a._id), title: a.title, percentage: a.result.percentage })),
    activity,
  });
});
