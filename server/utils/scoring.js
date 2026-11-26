export const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

export function isAnswered(q, a) {
  if (a === undefined || a === null) return false;
  if (q.type === 'mcq') return Number.isInteger(a);
  if (q.type === 'msq') return Array.isArray(a) && a.length > 0;
  if (q.type === 'truefalse') return typeof a === 'boolean';
  if (q.type === 'numerical') return String(a).trim() !== '' && Number.isFinite(Number(a));
  return typeof a === 'string' && a.trim().length > 0;
}

// Keep only well-formed answers for questions that exist in this attempt.
export function cleanAnswers(questions, raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const q of questions) {
    let a = Object.hasOwn(raw, q.id) ? raw[q.id] : undefined;
    const inRange = (i) => Number.isInteger(i) && i >= 0 && i < q.options.length;
    if (q.type === 'mcq' && !inRange(a)) continue;
    if (q.type === 'msq') {
      if (!Array.isArray(a)) continue;
      a = [...new Set(a.filter(inRange))].sort((x, y) => x - y);
    }
    if (q.type === 'numerical') a = typeof a === 'string' || typeof a === 'number' ? String(a).slice(0, 40) : undefined;
    if (q.type === 'short') a = typeof a === 'string' ? a.slice(0, 5000) : undefined;
    if (isAnswered(q, a)) out[q.id] = a;
  }
  return out;
}

export function gradeObjective(q, a) {
  let correct = false;
  if (q.type === 'mcq' || q.type === 'truefalse') correct = a === q.correctAnswer;
  else if (q.type === 'msq')
    correct = a.length === q.correctAnswer.length && q.correctAnswer.every((i) => a.includes(i));
  else if (q.type === 'numerical') {
    const { value, tolerance } = q.correctAnswer;
    correct = Math.abs(Number(a) - value) <= tolerance + 1e-9;
  }
  return {
    status: correct ? 'correct' : 'incorrect',
    awarded: correct ? q.marks : q.negativeMarks ? -q.negativeMarks : 0,
  };
}

// status: correct | partial | incorrect | unanswered | pending
export function summarise(questions, items) {
  const byId = new Map(items.map((i) => [i.questionId, i]));
  const topics = new Map();
  const counts = { correct: 0, partial: 0, incorrect: 0, unanswered: 0, pending: 0 };
  let score = 0;
  let total = 0;
  let negative = 0;
  let pendingMarks = 0;
  for (const q of questions) {
    const item = byId.get(q.id);
    counts[item.status]++;
    total += q.marks;
    score += item.awarded;
    if (item.awarded < 0) negative -= item.awarded;
    if (item.status === 'pending') pendingMarks += q.marks;
    const t = topics.get(q.topic) || { topic: q.topic, score: 0, total: 0, correct: 0, questions: 0, pending: 0 };
    t.questions++;
    if (item.status === 'pending') t.pending++;
    else {
      t.score += item.awarded;
      t.total += q.marks;
    }
    if (item.status === 'correct') t.correct++;
    topics.set(q.topic, t);
  }
  const graded = counts.correct + counts.partial + counts.incorrect;
  const gradedTotal = total - pendingMarks;
  return {
    score: round2(score),
    total: round2(total),
    // Questions still awaiting a grade are left out of the percentage
    percentage: gradedTotal ? round2((score / gradedTotal) * 100) : 0,
    accuracy: graded ? round2((counts.correct / graded) * 100) : 0,
    negativeDeducted: round2(negative),
    pendingMarks: round2(pendingMarks),
    counts,
    topics: [...topics.values()].map((t) => ({
      ...t,
      score: round2(t.score),
      percentage: t.total ? round2((t.score / t.total) * 100) : null,
    })),
    items,
  };
}
