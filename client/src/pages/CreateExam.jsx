import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { api, AI, errorMessage } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import MaterialUploader from '../components/MaterialUploader.jsx';
import { Button, DemoNotice, ErrorBox, Field, PageHeader, Skeleton } from '../components/ui.jsx';
import { TYPE_LABELS } from '../utils/format.js';

export default function CreateExam() {
  const patterns = useFetch('/patterns');
  if (patterns.error) return <ErrorBox message={patterns.error} onRetry={patterns.reload} />;
  if (!patterns.data) return <Skeleton />;
  return <Form {...patterns.data} />;
}

function Form({ patterns, demoMode }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const materials = useFetch('/materials');
  const preset = (examType) => {
    const { style, ...values } = patterns[examType];
    return { examType, ...values };
  };
  const [form, setForm] = useState(() => ({
    ...preset(user.preferences?.defaultExam || 'Custom'),
    examName: '', subject: demoMode ? 'Computer Science' : '', topic: demoMode ? 'Fundamentals' : '',
    difficulty: user.preferences?.defaultDifficulty || 'mixed', materialIds: [],
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const bind = (k) => ({ className: 'input', value: form[k], onChange: (e) => set({ [k]: e.target.value }), required: true });
  const toggle = (key, value) => setForm((f) => ({ ...f, [key]: f[key].includes(value) ? f[key].filter((x) => x !== value) : [...f[key], value] }));

  async function submit(e) {
    e.preventDefault();
    if (!form.questionTypes.length) return setError('Select at least one question type.');
    if (!demoMode && !form.materialIds.length) return setError('Upload or select at least one study material.');
    setBusy(true);
    setSeconds(0);
    setError('');
    try {
      const { data } = await api.post('/papers', form, AI);
      navigate(`/papers/${data.paper._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  const check = (checked, onChange, label, key) => (
    <label key={key} className="flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm dark:border-zinc-700"><input type="checkbox" className="accent-indigo-600" checked={checked} onChange={onChange} />{label}</label>
  );

  return (
    <>
      <PageHeader title="Create question paper" subtitle="Presets are editable starting points. Check the latest official pattern for a real exam." />
      <form onSubmit={submit} className="space-y-4">
        {demoMode && <DemoNotice />}
        <fieldset disabled={busy} className="space-y-4">
          <section className="card grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Examination"><select className="input" value={form.examType} onChange={(e) => set(preset(e.target.value))}>{Object.keys(patterns).map((k) => <option key={k} value={k}>{k === 'University' ? 'University Exams' : k}</option>)}</select></Field>
            {form.examType === 'Custom' && <Field label="Custom exam name"><input {...bind('examName')} maxLength={100} placeholder="e.g. Unit Test 2" /></Field>}
            <Field label="Subject"><input {...bind('subject')} maxLength={150} placeholder="e.g. Operating Systems" /></Field>
            <div className="sm:col-span-2"><Field label="Topic or syllabus"><textarea {...bind('topic')} rows={3} maxLength={3000} placeholder="e.g. Deadlocks, scheduling, memory management" /></Field></div>
          </section>
          <section className="card space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Difficulty"><select {...bind('difficulty')}>{['easy', 'medium', 'hard', 'mixed'].map((d) => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</select></Field>
              <Field label="Number of questions"><input {...bind('questionCount')} type="number" min="1" max="100" /></Field>
              <Field label="Duration (minutes)"><input {...bind('duration')} type="number" min="1" max="360" /></Field>
              <Field label="Marks per question"><input {...bind('marksPerQuestion')} type="number" min="0.25" max="100" step="any" /></Field>
              <Field label="Negative marks" hint="Deducted for a wrong answer"><input {...bind('negativeMarks')} type="number" min="0" step="any" /></Field>
            </div>
            <fieldset><legend className="label">Question types</legend><div className="flex flex-wrap gap-2">{Object.entries(TYPE_LABELS).map(([k, l]) => check(form.questionTypes.includes(k), () => toggle('questionTypes', k), l, k))}</div></fieldset>
            {Number(form.negativeMarks) > 0 && (
              <fieldset><legend className="label">Apply negative marking to</legend><div className="flex flex-wrap gap-2">{form.questionTypes.filter((t) => t !== 'short').map((t) => check(form.negativeTypes.includes(t), () => toggle('negativeTypes', t), TYPE_LABELS[t], t))}</div></fieldset>
            )}
          </section>
          {!demoMode && (
            <section className="card space-y-3 p-5">
              <h2 className="font-semibold">Study material <span className="muted text-sm font-normal">(select up to 5)</span></h2>
              <MaterialUploader onUploaded={(added) => { set({ materialIds: [...form.materialIds, ...added.map((m) => m.id)].slice(0, 5) }); materials.reload(); }} />
              <ErrorBox message={materials.error} onRetry={materials.reload} />
              <div className="max-h-56 space-y-2 overflow-auto">{materials.data?.materials.map((m) => check(form.materialIds.includes(m.id), () => toggle('materialIds', m.id), <span className="break-all">{m.filename}</span>, m.id))}</div>
            </section>
          )}
        </fieldset>
        <ErrorBox message={error} />
        <div className="flex flex-wrap items-center justify-end gap-3">
          {busy && <p className="muted text-sm" role="status">Generating and checking questions… {seconds}s. Larger papers can take a few minutes.</p>}
          <Button type="submit" busy={busy}><Sparkles size={16} />{demoMode ? 'Create demo paper' : 'Generate paper'}</Button>
        </div>
      </form>
    </>
  );
}
