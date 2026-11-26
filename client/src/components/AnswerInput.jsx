import { letter } from '../utils/format.js';

export default function AnswerInput({ question: q, value, onChange }) {
  const option = (key, type, checked, onSelect, label) => (
    <label key={key} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${checked ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-700'}`}>
      <input type={type} name={q.id} checked={checked} onChange={onSelect} className="mt-1 accent-indigo-600" />
      <span>{label}</span>
    </label>
  );
  if (q.type === 'mcq') return <div className="space-y-2">{q.options.map((o, i) => option(i, 'radio', value === i, () => onChange(i), `${letter(i)}. ${o}`))}</div>;
  if (q.type === 'msq') {
    const chosen = value || [];
    return <div className="space-y-2">{q.options.map((o, i) => option(i, 'checkbox', chosen.includes(i), () => onChange(chosen.includes(i) ? chosen.filter((x) => x !== i) : [...chosen, i]), `${letter(i)}. ${o}`))}</div>;
  }
  if (q.type === 'truefalse') return <div className="space-y-2">{[true, false].map((b) => option(String(b), 'radio', value === b, () => onChange(b), b ? 'True' : 'False'))}</div>;
  if (q.type === 'numerical')
    return <input className="input max-w-xs" inputMode="text" aria-label="Your numerical answer" placeholder="e.g. 12.5 or -3" value={value ?? ''} onChange={(e) => /^-?\d*\.?\d*$/.test(e.target.value) && onChange(e.target.value)} />;
  return <textarea className="input" rows={7} maxLength={5000} aria-label="Your answer" placeholder="Write your answer…" value={value ?? ''} onChange={(e) => onChange(e.target.value)} />;
}
