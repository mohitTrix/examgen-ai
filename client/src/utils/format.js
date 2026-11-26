export const TYPE_LABELS = { mcq: 'Multiple Choice', msq: 'Multiple Select', numerical: 'Numerical Answer', truefalse: 'True / False', short: 'Short Answer' };
export const TYPE_HINTS = {
  mcq: 'Choose one option.', msq: 'Choose all correct options. No partial marks.',
  numerical: 'Enter a number.', truefalse: 'Choose True or False.', short: 'Answer in a few sentences.',
};
export const letter = (i) => String.fromCharCode(65 + i);
export const date = (d) => new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
export const totalMarks = (qs) => Math.round(qs.reduce((s, q) => s + q.marks, 0) * 100) / 100;

export function formatAnswer(q, a) {
  if (a === undefined || a === null || a === '') return 'Not answered';
  if (q.type === 'mcq') return `${letter(a)}. ${q.options[a]}`;
  if (q.type === 'msq') return a.map((i) => `${letter(i)}. ${q.options[i]}`).join('; ');
  if (q.type === 'truefalse') return a ? 'True' : 'False';
  if (q.type === 'numerical' && typeof a === 'object') return a.tolerance ? `${a.value} (± ${a.tolerance})` : String(a.value);
  return String(a);
}

export function clock(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const pad = (n) => String(n).padStart(2, '0');
  return `${s >= 3600 ? `${Math.floor(s / 3600)}:` : ''}${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}`;
}

export const instructions = (paper) => {
  const penalised = paper.questions.some((q) => q.negativeMarks > 0);
  return [
    'All questions carry the marks shown beside them.',
    penalised ? 'Wrong answers lose the marks shown as negative. Unanswered questions score zero.' : 'There is no negative marking.',
    'Multiple-select questions are scored only when exactly the correct options are chosen.',
  ];
};

export function sections(questions) {
  const groups = new Map();
  questions.forEach((q, index) => {
    if (!groups.has(q.type)) groups.set(q.type, []);
    groups.get(q.type).push({ q, number: 0, index });
  });
  let n = 0;
  return [...groups].map(([type, items], i) => ({ type, name: `Section ${letter(i)}`, items: items.map((it) => ({ ...it, number: ++n })) }));
}
