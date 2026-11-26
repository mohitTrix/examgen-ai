// Single source of truth for what a valid question looks like.
// Used for AI output AND for manual edits.
import { QUESTION_TYPES } from './constants.js';

const text = (v, max) => (typeof v === 'string' && v.trim() && v.trim().length <= max ? v.trim() : null);

export function validateQuestion(q) {
  const errors = [];
  if (!q || typeof q !== 'object') return { errors: ['Question must be an object.'] };
  const type = q.type;
  if (!QUESTION_TYPES.includes(type)) return { errors: ['Unknown question type.'] };

  const out = {
    type,
    text: text(q.text, 3000),
    explanation: text(q.explanation, 4000),
    topic: text(q.topic, 120) || 'General',
    difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    sourceQuote: typeof q.sourceQuote === 'string' ? q.sourceQuote.trim().slice(0, 600) : '',
    options: [],
    rubric: [],
  };
  if (!out.text) errors.push('Question text is required.');
  if (!out.explanation) errors.push('Explanation is required.');

  const a = q.correctAnswer;
  if (type === 'mcq' || type === 'msq') {
    const options = Array.isArray(q.options) ? q.options.map((o) => text(o, 600)) : [];
    if (options.length < 2 || options.length > 6 || options.some((o) => !o)) errors.push('Provide 2 to 6 non-empty options.');
    else if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) errors.push('Options must be unique.');
    out.options = options;
    const valid = (i) => Number.isInteger(i) && i >= 0 && i < options.length;
    if (type === 'mcq') {
      if (!valid(a)) errors.push('Select the correct option.');
      out.correctAnswer = a;
    } else {
      if (!Array.isArray(a) || !a.length || !a.every(valid) || new Set(a).size !== a.length)
        errors.push('Select one or more correct options.');
      out.correctAnswer = Array.isArray(a) ? [...a].sort((x, y) => x - y) : [];
    }
  } else if (type === 'truefalse') {
    if (typeof a !== 'boolean') errors.push('Correct answer must be true or false.');
    out.correctAnswer = a;
  } else if (type === 'numerical') {
    const value = a?.value;
    const tolerance = a?.tolerance ?? 0;
    if (typeof value !== 'number' || !Number.isFinite(value)) errors.push('Numerical answer must be a number.');
    if (typeof tolerance !== 'number' || !(tolerance >= 0)) errors.push('Tolerance must be zero or more.');
    out.correctAnswer = { value, tolerance };
  } else {
    out.correctAnswer = text(a, 4000);
    if (!out.correctAnswer) errors.push('A model answer is required.');
    const rubric = Array.isArray(q.rubric) ? q.rubric : [];
    out.rubric = rubric
      .map((r) => ({ point: text(r?.point, 500), weight: Number(r?.weight) }))
      .filter((r) => r.point && r.weight > 0 && Number.isFinite(r.weight));
    if (!out.rubric.length || out.rubric.length !== rubric.length || rubric.length > 8)
      errors.push('Provide 1 to 8 rubric points, each with a positive weight.');
  }
  return errors.length ? { errors } : { errors, question: out };
}
