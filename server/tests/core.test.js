import { test } from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { generateQuestions, planSlots } from '../services/generation.js';
import { evaluate, gradeShort } from '../services/evaluation.js';
import { DEMO_BANK } from '../services/demo.js';
import { checkSignature, extractText } from '../services/documents.js';
import { completeJson } from '../services/llm.js';
import { validateQuestion } from '../utils/questionSchema.js';
import { cleanAnswers, gradeObjective, summarise } from '../utils/scoring.js';
import { isDuplicate, quoteInSource, normalise, selectContext } from '../utils/text.js';
import { paperConfig } from '../utils/validators.js';

const config = {
  examType: 'Custom', examName: 'Quiz', subject: 'Biology', topic: 'photosynthesis', difficulty: 'easy',
  questionCount: 2, duration: 10, questionTypes: ['truefalse'], marksPerQuestion: 4, negativeMarks: 1, negativeTypes: ['truefalse'], materialIds: [],
};
const material = 'Photosynthesis converts light energy into chemical energy. It takes place in the chloroplasts of plant cells.';
const good = (text, sourceQuote) => ({ type: 'truefalse', difficulty: 'easy', topic: 'Photosynthesis', text, correctAnswer: true, explanation: 'Stated.', sourceQuote });
const useAi = () => { env.ai.apiKey = 'test-key'; env.ai.model = 'test'; env.forceDemo = false; };
const useDemo = () => { env.ai.apiKey = ''; };

test('every demo question passes the same schema as AI output', () => {
  for (const q of DEMO_BANK) assert.deepEqual(validateQuestion(q).errors, [], q.text);
});

test('slots honour count, types and mixed difficulty', () => {
  const s = planSlots({ questionCount: 7, questionTypes: ['mcq', 'short'], difficulty: 'mixed' });
  assert.equal(s.length, 7);
  assert.equal(s.filter((x) => x.type === 'mcq').length, 4);
  assert.deepEqual(new Set(s.map((x) => x.difficulty)), new Set(['easy', 'medium', 'hard']));
});

test('AI pipeline drops ungrounded, duplicate and invalid questions', async () => {
  useAi();
  const replies = [
    [good('Light energy becomes chemical energy.', 'Photosynthesis converts light energy into chemical energy.'),
     good('Light energy becomes chemical energy.', 'Photosynthesis converts light energy into chemical energy.'),
     good('Mitochondria do photosynthesis.', 'This sentence is not anywhere in the material.'),
     { type: 'truefalse' }],
    [good('Photosynthesis happens in chloroplasts.', 'It takes place in the chloroplasts of plant cells.')],
  ];
  let calls = 0;
  const out = await generateQuestions(config, material, { complete: async () => ({ questions: replies[calls++] }) });
  assert.equal(calls, 2);
  assert.equal(out.length, 2);
  assert.equal(out[0].marks, 4);
  assert.equal(out[0].negativeMarks, 1);
});

test('AI pipeline fails loudly instead of padding or using demo questions', async () => {
  useAi();
  await assert.rejects(generateQuestions(config, material, { complete: async () => ({ questions: [] }) }), /Only 0 of 2/);
  await assert.rejects(generateQuestions(config, material, { complete: async () => ({}) }), /expected format/);
});

test('off-topic material is rejected before any AI call', async () => {
  useAi();
  await assert.rejects(
    generateQuestions({ ...config, subject: 'History', topic: 'Mughal empire' }, material, { complete: async () => assert.fail('called') }),
    /None of the subject/
  );
});

test('demo mode is used only without a key, and limits are explicit', async () => {
  useDemo();
  const out = await generateQuestions({ ...config, questionCount: 3 }, '');
  assert.equal(out.length, 3);
  await assert.rejects(generateQuestions({ ...config, questionCount: 4 }, ''), /only 3 sample/);
});

test('objective scoring: negative marks, multiple select, numeric tolerance', () => {
  const q = (type, correctAnswer) => ({ type, correctAnswer, marks: 4, negativeMarks: 1, options: ['a', 'b', 'c'] });
  assert.equal(gradeObjective(q('mcq', 1), 1).awarded, 4);
  assert.equal(gradeObjective(q('mcq', 1), 0).awarded, -1);
  assert.equal(gradeObjective(q('msq', [0, 2]), [2, 0]).awarded, 4);
  assert.equal(gradeObjective(q('msq', [0, 2]), [0]).awarded, -1);
  assert.equal(gradeObjective(q('numerical', { value: 2.5, tolerance: 0.1 }), '2.6').awarded, 4);
  assert.equal(gradeObjective(q('truefalse', false), false).awarded, 4);
});

test('malformed answers are discarded, zero and false are kept', () => {
  const qs = [
    { id: 'a', type: 'mcq', options: ['x', 'y'] }, { id: 'b', type: 'numerical', options: [] },
    { id: 'c', type: 'truefalse', options: [] }, { id: 'd', type: 'short', options: [] },
  ];
  assert.deepEqual(cleanAnswers(qs, { a: 9, b: '0', c: false, d: '   ', z: 1 }), { b: '0', c: false });
});

test('summary covers percentage, accuracy, topics and pending answers', () => {
  const qs = ['1', '2', '3', '4'].map((id) => ({ id, marks: 4, topic: id < '3' ? 'A' : 'B' }));
  const s = summarise(qs, [
    { questionId: '1', status: 'correct', awarded: 4 }, { questionId: '2', status: 'incorrect', awarded: -1 },
    { questionId: '3', status: 'unanswered', awarded: 0 }, { questionId: '4', status: 'pending', awarded: 0 },
  ]);
  assert.equal(s.score, 3);
  assert.equal(s.percentage, 25);
  assert.equal(s.accuracy, 50);
  assert.equal(s.negativeDeducted, 1);
  assert.equal(s.topics[0].percentage, 37.5);
});

test('short answers: rubric marks are clamped; failures become pending', async () => {
  useAi();
  const q = { id: 's', type: 'short', text: 't', correctAnswer: 'm', marks: 5, options: [], topic: 'T', rubric: [{ point: 'a', weight: 1 }, { point: 'b', weight: 1 }] };
  const r = await gradeShort(q, 'ans', { complete: async () => ({ points: [{ index: 0, awarded: 99 }, { index: 1, awarded: -3 }] }) });
  assert.equal(r.awarded, 2.5);
  assert.equal(r.status, 'partial');
  const result = await evaluate([q], { s: 'ans' }, { complete: async () => { throw new Error('down'); } });
  assert.equal(result.counts.pending, 1);
  useDemo();
  assert.equal((await evaluate([q], { s: 'ans' })).counts.pending, 1);
});

test('grounding and duplicate checks', () => {
  assert.ok(quoteInSource('converts LIGHT energy into chemical energy', normalise(material)));
  assert.ok(!quoteInSource('energy', normalise(material)));
  assert.ok(isDuplicate({ text: 'What is photosynthesis?' }, [{ text: 'what is Photosynthesis' }]));
  assert.ok(!isDuplicate({ text: 'What is 2 + 3?' }, [{ text: 'What is 4 + 5?' }]));
});

test('long documents are trimmed to the context budget, keeping relevant parts', () => {
  const long = [...Array(80)].map((_, i) => (i === 70 ? 'photosynthesis detail ' : 'filler ') + 'x '.repeat(500)).join('\n\n');
  const { context } = selectContext(long, 'photosynthesis', 8000);
  assert.ok(context.length <= 8100);
  assert.match(context, /photosynthesis detail/);
});

test('file checks reject spoofed and near-empty files', async () => {
  assert.ok(!checkSignature('.pdf', Buffer.from('MZ not a pdf')));
  await assert.rejects(extractText({ originalname: 'a.exe', buffer: Buffer.from('x') }), /not a valid/);
  await assert.rejects(extractText({ originalname: 'a.txt', buffer: Buffer.from('short') }), /too little text/);
  const ok = await extractText({ originalname: 'a.txt', buffer: Buffer.from(material.repeat(4)) });
  assert.ok(ok.text.length > 200);
});

test('LLM client retries rate limits, parses fenced JSON, reports bad keys', async () => {
  useAi();
  let n = 0;
  const fetchImpl = async () => ++n === 1
    ? { ok: false, status: 429, text: async () => '' }
    : { ok: true, json: async () => ({ choices: [{ message: { content: '```json\n{"a":1}\n```' } }] }) };
  assert.deepEqual(await completeJson('s', 'u', { fetchImpl, retryDelay: 1 }), { a: 1 });
  await assert.rejects(completeJson('s', 'u', { fetchImpl: async () => ({ ok: false, status: 401, text: async () => '' }) }), /key was rejected/);
});

test('paper configuration validation', () => {
  assert.throws(() => paperConfig({ ...config, questionTypes: [] }), /at least one/);
  assert.throws(() => paperConfig({ ...config, negativeMarks: 10 }), /between/);
  assert.throws(() => paperConfig({ ...config, examName: '' }), /Custom exam name/);
  assert.equal(paperConfig({ ...config, examType: 'NEET' }).examName, 'NEET');
});
