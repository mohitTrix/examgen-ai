import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button, ErrorBox, Field } from './ui.jsx';
import { letter } from '../utils/format.js';

export default function QuestionEditor({ question, onSave, onCancel }) {
  const [q, setQ] = useState(() => structuredClone(question));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (patch) => setQ((old) => ({ ...old, ...patch }));
  const choice = q.type === 'mcq' || q.type === 'msq';
  const isRight = (i) => (q.type === 'mcq' ? q.correctAnswer === i : q.correctAnswer.includes(i));
  const toggle = (i) =>
    set({ correctAnswer: q.type === 'mcq' ? i : isRight(i) ? q.correctAnswer.filter((x) => x !== i) : [...q.correctAnswer, i] });
  const remove = (i) => {
    const shift = (x) => (x > i ? x - 1 : x);
    set({
      options: q.options.filter((_, x) => x !== i),
      correctAnswer: q.type === 'mcq'
        ? (q.correctAnswer === i ? null : shift(q.correctAnswer))
        : q.correctAnswer.filter((x) => x !== i).map(shift),
    });
  };
  const toNumber = (v) => (String(v).trim() === '' ? NaN : Number(v));

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const body = { ...q, marks: Number(q.marks), negativeMarks: Number(q.negativeMarks) };
    if (q.type === 'numerical') body.correctAnswer = { value: toNumber(q.correctAnswer.value), tolerance: toNumber(q.correctAnswer.tolerance) };
    const message = await onSave(body);
    if (message) {
      setError(message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field label="Question"><textarea className="input" rows={3} value={q.text} onChange={(e) => set({ text: e.target.value })} required /></Field>
      {choice && (
        <fieldset className="space-y-2">
          <legend className="label">Options (mark the correct {q.type === 'mcq' ? 'one' : 'ones'})</legend>
          {q.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type={q.type === 'mcq' ? 'radio' : 'checkbox'} name="correct" checked={isRight(i)} onChange={() => toggle(i)} aria-label={`Option ${letter(i)} is correct`} />
              <input className="input" value={o} aria-label={`Option ${letter(i)}`} onChange={(e) => set({ options: q.options.map((x, j) => (j === i ? e.target.value : x)) })} />
              {q.options.length > 2 && <button type="button" className="btn btn-danger btn-sm" onClick={() => remove(i)} aria-label="Remove option"><Trash2 size={14} /></button>}
            </div>
          ))}
          {q.options.length < 6 && <Button variant="secondary" className="btn-sm" onClick={() => set({ options: [...q.options, ''] })}><Plus size={14} />Add option</Button>}
        </fieldset>
      )}
      {q.type === 'truefalse' && (
        <Field label="Correct answer">
          <select className="input" value={String(q.correctAnswer)} onChange={(e) => set({ correctAnswer: e.target.value === 'true' })}><option value="true">True</option><option value="false">False</option></select>
        </Field>
      )}
      {q.type === 'numerical' && (
        <div className="grid grid-cols-2 gap-3">
          {['value', 'tolerance'].map((k) => (
            <Field key={k} label={k === 'value' ? 'Correct value' : 'Tolerance (±)'}>
              <input className="input" type="number" step="any" required value={q.correctAnswer[k]} onChange={(e) => set({ correctAnswer: { ...q.correctAnswer, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
      )}
      {q.type === 'short' && (
        <>
          <Field label="Model answer"><textarea className="input" rows={3} value={q.correctAnswer} onChange={(e) => set({ correctAnswer: e.target.value })} /></Field>
          <fieldset className="space-y-2">
            <legend className="label">Rubric points and relative weights</legend>
            {q.rubric.map((r, i) => {
              const update = (patch) => set({ rubric: q.rubric.map((x, j) => (j === i ? { ...x, ...patch } : x)) });
              return (
                <div key={i} className="flex gap-2">
                  <input className="input" aria-label="Rubric point" value={r.point} onChange={(e) => update({ point: e.target.value })} />
                  <input className="input !w-20" aria-label="Weight" type="number" min="0.1" step="any" value={r.weight} onChange={(e) => update({ weight: e.target.value })} />
                  {q.rubric.length > 1 && <button type="button" className="btn btn-danger btn-sm" aria-label="Remove rubric point" onClick={() => set({ rubric: q.rubric.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>}
                </div>
              );
            })}
            {q.rubric.length < 8 && <Button variant="secondary" className="btn-sm" onClick={() => set({ rubric: [...q.rubric, { point: '', weight: 1 }] })}><Plus size={14} />Add point</Button>}
          </fieldset>
        </>
      )}
      <Field label="Explanation"><textarea className="input" rows={3} value={q.explanation} onChange={(e) => set({ explanation: e.target.value })} /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Marks"><input className="input" type="number" min="0.25" step="any" value={q.marks} onChange={(e) => set({ marks: e.target.value })} /></Field>
        <Field label="Negative"><input className="input" type="number" min="0" step="any" disabled={q.type === 'short'} value={q.negativeMarks} onChange={(e) => set({ negativeMarks: e.target.value })} /></Field>
        <Field label="Topic"><input className="input" value={q.topic} onChange={(e) => set({ topic: e.target.value })} /></Field>
      </div>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2">
        <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
        <Button type="submit" busy={busy}>Save question</Button>
      </div>
    </form>
  );
}
