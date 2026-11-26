import Attempt from '../models/Attempt.js';
import { evaluate, gradeOne } from '../services/evaluation.js';
import { cleanAnswers, round2, summarise } from '../utils/scoring.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import * as v from '../utils/validators.js';
import { findOwnPaper } from './paperController.js';

const GRACE_MS = 15_000; // allows for network delay at time-up
const STALE_MS = 5 * 60_000; // recovers attempts if the server died while grading
const plain = (doc) => (doc.toObject ? doc.toObject() : doc);

// While an exam is running the browser must never receive answers or explanations.
export function attemptView(doc) {
  const a = plain(doc);
  const done = a.status === 'submitted';
  return {
    ...a,
    questions: a.questions.map((q) =>
      done ? q : { id: q.id, type: q.type, text: q.text, options: q.options, marks: q.marks, negativeMarks: q.negativeMarks, topic: q.topic }
    ),
    serverNow: new Date().toISOString(),
  };
}

async function findOwn(req) {
  const a = v.isId(req.params.id) && (await Attempt.findOne({ _id: req.params.id, user: req.user._id }));
  if (!a) throw new HttpError(404, 'Attempt not found.');
  return a;
}

const sanitiseState = (attempt, body = {}) => {
  const questions = attempt.questions.map(plain);
  const ids = new Set(questions.map((q) => q.id));
  return {
    answers: cleanAnswers(questions, body.answers),
    marked: Array.isArray(body.marked) ? [...new Set(body.marked.filter((id) => ids.has(id)))] : [],
    current: Number.isInteger(body.current) ? Math.min(Math.max(body.current, 0), questions.length - 1) : 0,
  };
};

// Atomically claim the attempt, so a double click or auto-submit race grades it only once.
export async function finalise(attempt, body) {
  const now = Date.now();
  const onTime = now <= new Date(attempt.deadline).getTime() + GRACE_MS;
  const update = { status: 'evaluating', evaluatingAt: new Date(now) };
  if (body?.answers && onTime) Object.assign(update, sanitiseState(attempt, body));
  const claimed = await Attempt.findOneAndUpdate(
    {
      _id: attempt._id,
      $or: [{ status: 'in_progress' }, { status: 'evaluating', evaluatingAt: { $lt: new Date(now - STALE_MS) } }],
    },
    { $set: update },
    { new: true }
  );
  if (!claimed) return Attempt.findById(attempt._id);
  const result = await evaluate(claimed.questions.map(plain), claimed.answers);
  claimed.result = result;
  claimed.status = 'submitted';
  claimed.submittedAt = new Date(Math.min(now, new Date(claimed.deadline).getTime()));
  await claimed.save();
  return claimed;
}

const needsFinalising = (a) =>
  (a.status === 'in_progress' && Date.now() > new Date(a.deadline).getTime() + GRACE_MS) ||
  (a.status === 'evaluating' && Date.now() - new Date(a.evaluatingAt).getTime() > STALE_MS);

export const startAttempt = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req, req.body?.paperId);
  let running = await Attempt.findOne({ user: req.user._id, paper: paper._id, status: 'in_progress' });
  if (running && needsFinalising(running)) {
    await finalise(running);
    running = null;
  }
  if (running) return res.json({ attempt: attemptView(running), resumed: true });
  const p = plain(paper);
  const startedAt = new Date();
  const attempt = await Attempt.create({
    user: req.user._id, paper: p._id, title: p.title, examName: p.examName, subject: p.subject, mode: p.mode,
    duration: p.duration, questions: p.questions, startedAt, deadline: new Date(startedAt.getTime() + p.duration * 60_000),
  });
  res.status(201).json({ attempt: attemptView(attempt), resumed: false });
});

export const getAttempt = asyncHandler(async (req, res) => {
  let attempt = await findOwn(req);
  if (needsFinalising(attempt)) attempt = await finalise(attempt);
  res.json({ attempt: attemptView(attempt) });
});

export const saveProgress = asyncHandler(async (req, res) => {
  const attempt = await findOwn(req);
  if (attempt.status !== 'in_progress') throw new HttpError(409, 'This exam has already been submitted.');
  if (Date.now() > new Date(attempt.deadline).getTime() + GRACE_MS) throw new HttpError(409, 'Time is up.');
  const revision = v.num(req.body?.revision, 'Revision', { min: 1, max: Number.MAX_SAFE_INTEGER, integer: true });
  // Older, delayed requests cannot overwrite newer answers
  const r = await Attempt.updateOne(
    { _id: attempt._id, status: 'in_progress', revision: { $lt: revision } },
    { $set: { ...sanitiseState(attempt, req.body), revision } }
  );
  res.json({ saved: r.modifiedCount === 1 });
});

export const submitAttempt = asyncHandler(async (req, res) => {
  const attempt = await finalise(await findOwn(req), req.body);
  res.json({ attempt: attemptView(attempt) });
});

async function gradePending(req, grade) {
  const attempt = await findOwn(req);
  if (attempt.status !== 'submitted') throw new HttpError(409, 'Submit the exam first.');
  const questions = attempt.questions.map(plain);
  const q = questions.find((x) => x.id === req.params.qid);
  const items = [...attempt.result.items];
  const i = items.findIndex((x) => x.questionId === req.params.qid);
  if (!q || i < 0 || items[i].status !== 'pending') throw new HttpError(409, 'This answer is not waiting for a grade.');
  items[i] = await grade(q, attempt.answers[q.id]);
  attempt.result = summarise(questions, items);
  attempt.markModified?.('result');
  await attempt.save();
  return attempt;
}

export const retryGrading = asyncHandler(async (req, res) => {
  const attempt = await gradePending(req, (q, answer) => gradeOne(q, answer));
  res.json({ attempt: attemptView(attempt) });
});

export const selfGrade = asyncHandler(async (req, res) => {
  const attempt = await gradePending(req, (q) => {
    const marks = round2(v.num(req.body?.marks, 'Marks', { min: 0, max: q.marks }));
    return {
      questionId: q.id,
      status: marks === q.marks ? 'correct' : marks > 0 ? 'partial' : 'incorrect',
      awarded: marks,
      gradedBy: 'self',
      feedback: 'Self-assessed against the rubric.',
    };
  });
  res.json({ attempt: attemptView(attempt) });
});

export const listAttempts = asyncHandler(async (req, res) => {
  const attempts = await Attempt.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  const out = [];
  for (let a of attempts) {
    if (needsFinalising(a)) a = await finalise(a);
    const { questions, answers, result, ...rest } = plain(a);
    out.push({ ...rest, result: result && { score: result.score, total: result.total, percentage: result.percentage, pendingMarks: result.pendingMarks } });
  }
  res.json({ attempts: out });
});
