import { HttpError } from './httpError.js';
import { QUESTION_TYPES, DIFFICULTIES, EXAMS, MAX_QUESTIONS } from './constants.js';

export function str(value, field, { min = 1, max = 500 } = {}) {
  if (typeof value !== 'string') throw new HttpError(400, `${field} is required.`);
  const v = value.trim();
  if (v.length < min) throw new HttpError(400, min <= 1 ? `${field} is required.` : `${field} must be at least ${min} characters.`);
  if (v.length > max) throw new HttpError(400, `${field} must be at most ${max} characters.`);
  return v;
}

export function num(value, field, { min, max, integer = false }) {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new HttpError(400, `${field} must be a number.`);
  if (integer && !Number.isInteger(n)) throw new HttpError(400, `${field} must be a whole number.`);
  if (n < min || n > max) throw new HttpError(400, `${field} must be between ${min} and ${max}.`);
  return n;
}

export function oneOf(value, field, list) {
  if (!list.includes(value)) throw new HttpError(400, `${field} must be one of: ${list.join(', ')}.`);
  return value;
}

export function email(value) {
  const v = str(value, 'Email', { max: 200 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) throw new HttpError(400, 'Enter a valid email address.');
  return v;
}

export function password(value) {
  if (typeof value !== 'string' || value.length < 8) throw new HttpError(400, 'Password must be at least 8 characters.');
  // bcrypt only reads the first 72 bytes
  if (Buffer.byteLength(value) > 72) throw new HttpError(400, 'Password must be at most 72 bytes.');
  return value;
}

export const isId = (v) => typeof v === 'string' && /^[a-f0-9]{24}$/i.test(v);

export function paperConfig(body = {}) {
  const examType = oneOf(body.examType, 'Examination', EXAMS);
  const examName = examType === 'Custom' ? str(body.examName, 'Custom exam name', { max: 100 }) : examType;
  const types = Array.isArray(body.questionTypes) ? [...new Set(body.questionTypes)] : [];
  if (!types.length) throw new HttpError(400, 'Select at least one question type.');
  types.forEach((t) => oneOf(t, 'Question type', QUESTION_TYPES));
  const marksPerQuestion = num(body.marksPerQuestion, 'Marks per question', { min: 0.25, max: 100 });
  const negativeMarks = num(body.negativeMarks ?? 0, 'Negative marking', { min: 0, max: marksPerQuestion });
  const negativeTypes = (Array.isArray(body.negativeTypes) ? body.negativeTypes : []).filter(
    (t) => types.includes(t) && t !== 'short'
  );
  const materialIds = Array.isArray(body.materialIds) ? [...new Set(body.materialIds)] : [];
  if (materialIds.length > 5 || !materialIds.every(isId)) throw new HttpError(400, 'Choose up to 5 valid study materials.');
  return {
    examType,
    examName,
    subject: str(body.subject, 'Subject', { max: 150 }),
    topic: str(body.topic, 'Topic or syllabus', { max: 3000 }),
    difficulty: oneOf(body.difficulty, 'Difficulty', DIFFICULTIES),
    questionCount: num(body.questionCount, 'Number of questions', { min: 1, max: MAX_QUESTIONS, integer: true }),
    duration: num(body.duration, 'Duration (minutes)', { min: 1, max: 360, integer: true }),
    questionTypes: types,
    marksPerQuestion,
    negativeMarks,
    negativeTypes,
    materialIds,
  };
}
