import Paper from '../models/Paper.js';
import Material from '../models/Material.js';
import { isDemo } from '../config/env.js';
import { generateQuestions } from '../services/generation.js';
import { EXAM_PATTERNS } from '../services/examPatterns.js';
import { HttpError, asyncHandler } from '../utils/httpError.js';
import { validateQuestion } from '../utils/questionSchema.js';
import * as v from '../utils/validators.js';

export const patterns = (_req, res) => res.json({ patterns: EXAM_PATTERNS, demoMode: isDemo() });

async function loadMaterialText(userId, ids) {
  if (isDemo()) return '';
  if (!ids.length) throw new HttpError(400, 'Select at least one study material.');
  const docs = await Material.find({ _id: { $in: ids }, user: userId }).select('+text');
  if (docs.length !== ids.length) throw new HttpError(400, 'Some selected materials no longer exist. Create a new paper with current files.');
  return docs.map((d) => d.text).join('\n\n');
}

export async function findOwnPaper(req, id = req.params.id) {
  const paper = v.isId(id) && (await Paper.findOne({ _id: id, user: req.user._id }));
  if (!paper) throw new HttpError(404, 'Question paper not found.');
  return paper;
}

const plain = (doc) => (doc.toObject ? doc.toObject() : doc);

export const createPaper = asyncHandler(async (req, res) => {
  const config = v.paperConfig(req.body);
  if (isDemo()) config.materialIds = []; // demo questions never come from uploads
  const text = await loadMaterialText(req.user._id, config.materialIds);
  const questions = await generateQuestions(config, text);
  const mode = isDemo() ? 'demo' : 'ai';
  const title = mode === 'demo' ? `[Demo] ${config.examName} sample paper` : `${config.examName}: ${config.subject}`;
  const paper = await Paper.create({ ...config, user: req.user._id, title, mode, questions });
  res.status(201).json({ paper });
});

export const listPapers = asyncHandler(async (req, res) => {
  const papers = await Paper.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(100);
  res.json({
    papers: papers.map((p) => {
      const { questions, ...rest } = plain(p);
      return { ...rest, questionCount: questions.length, totalMarks: questions.reduce((s, q) => s + q.marks, 0) };
    }),
  });
});

export const getPaper = asyncHandler(async (req, res) => res.json({ paper: await findOwnPaper(req) }));

export const updatePaper = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req);
  if (req.body?.title !== undefined) paper.title = v.str(req.body.title, 'Title', { max: 200 });
  if (req.body?.duration !== undefined) paper.duration = v.num(req.body.duration, 'Duration', { min: 1, max: 360, integer: true });
  await paper.save();
  res.json({ paper });
});

export const deletePaper = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req);
  await paper.deleteOne();
  res.json({ ok: true });
});

function indexOfQuestion(paper, qid) {
  const i = paper.questions.findIndex((q) => q.id === qid);
  if (i < 0) throw new HttpError(404, 'Question not found.');
  return i;
}

export const editQuestion = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req);
  const i = indexOfQuestion(paper, req.params.qid);
  const old = plain(paper.questions[i]);
  const { errors, question } = validateQuestion({ ...req.body, type: old.type, sourceQuote: old.sourceQuote });
  if (errors.length) throw new HttpError(400, errors.join(' '));
  const marks = v.num(req.body.marks, 'Marks', { min: 0.25, max: 100 });
  const negativeMarks = old.type === 'short' ? 0 : v.num(req.body.negativeMarks ?? 0, 'Negative marks', { min: 0, max: marks });
  paper.questions.set(i, { ...question, id: old.id, marks, negativeMarks, edited: true });
  await paper.save();
  res.json({ paper });
});

export const regenerateQuestion = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req);
  const i = indexOfQuestion(paper, req.params.qid);
  const old = plain(paper.questions[i]);
  const config = plain(paper);
  const text = await loadMaterialText(req.user._id, config.materialIds.map(String));
  const [fresh] = await generateQuestions(config, text, {
    existing: paper.questions.map(plain),
    slots: [{ type: old.type, difficulty: old.difficulty }],
  });
  paper.questions.set(i, { ...fresh, marks: old.marks, negativeMarks: old.negativeMarks });
  await paper.save();
  res.json({ paper });
});

export const regeneratePaper = asyncHandler(async (req, res) => {
  const paper = await findOwnPaper(req);
  const config = plain(paper);
  const text = await loadMaterialText(req.user._id, config.materialIds.map(String));
  // In AI mode, ask for questions different from the current ones.
  // The small demo bank may need to reuse samples.
  const questions = await generateQuestions(config, text, { existing: isDemo() ? [] : paper.questions.map(plain) });
  paper.questions = questions;
  paper.mode = isDemo() ? 'demo' : 'ai';
  await paper.save(); // the old paper is only replaced after generation succeeds
  res.json({ paper });
});
