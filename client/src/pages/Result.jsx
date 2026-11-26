import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { RotateCcw } from 'lucide-react';
import { api, AI, errorMessage } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Button, DemoNotice, ErrorBox, PageHeader, Skeleton } from '../components/ui.jsx';
import { TYPE_LABELS, date, formatAnswer } from '../utils/format.js';

const STATUS = {
  correct: ['Correct', 'text-emerald-700 dark:text-emerald-400'], partial: ['Partly correct', 'text-amber-700 dark:text-amber-400'],
  incorrect: ['Incorrect', 'text-red-700 dark:text-red-400'], unanswered: ['Unanswered', 'muted'], pending: ['Awaiting grade', 'text-indigo-700 dark:text-indigo-400'],
};

function SelfGrade({ q, busy, onGrade, onRetry, canRetry }) {
  const [marks, setMarks] = useState('');
  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => { e.preventDefault(); onGrade(Number(marks)); }}>
      <input className="input !w-28" type="number" required min="0" max={q.marks} step="any" value={marks} onChange={(e) => setMarks(e.target.value)} aria-label="Your marks" placeholder={`0 to ${q.marks}`} />
      <Button type="submit" variant="secondary" busy={busy}>Save my score</Button>
      {canRetry && <Button variant="secondary" disabled={busy} onClick={onRetry}>Retry AI grading</Button>}
    </form>
  );
}

export default function Result() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload, setData } = useFetch(`/attempts/${id}`);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Skeleton rows={4} />;
  const a = data.attempt;
  if (a.status !== 'submitted')
    return <div className="card p-6"><p className="mb-4">This exam has no result yet.</p>{a.status === 'in_progress' ? <Link className="btn btn-primary" to={`/exam/${id}`}>Resume exam</Link> : <Button onClick={reload}>Check again</Button>}</div>;
  const r = a.result;

  async function run(key, fn) {
    setBusy(key);
    setActionError('');
    try { await fn(); } catch (e) { setActionError(errorMessage(e)); }
    setBusy('');
  }
  const grade = (q, path, body) => run(q.id, async () => setData((await api.post(`/attempts/${id}/questions/${q.id}/${path}`, body, AI)).data));
  const reattempt = () => run('again', async () => navigate(`/exam/${(await api.post('/attempts', { paperId: a.paper })).data.attempt._id}`));
  const rows = a.questions.map((q, i) => ({ q, number: i + 1, item: r.items.find((x) => x.questionId === q.id) })).filter((x) => filter === 'all' || x.item.status === filter);

  return (
    <>
      <PageHeader title="Result and analysis" subtitle={`${a.title} · ${date(a.submittedAt)}`}>
        <Button onClick={reattempt} busy={busy === 'again'}><RotateCcw size={16} />Reattempt</Button>
        <Link to="/history" className="btn btn-secondary">History</Link>
      </PageHeader>
      <div className="space-y-5">
        {a.mode === 'demo' && <DemoNotice />}
        <ErrorBox message={actionError} />
        {r.pendingMarks > 0 && <p className="card p-4 text-sm"><strong>Provisional result.</strong> {r.pendingMarks} marks still need grading and are left out of the percentage.</p>}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[['Score', `${r.score} / ${r.total}`], ['Percentage', `${r.percentage}%`], ['Accuracy', `${r.accuracy}%`], ['Negative marks', r.negativeDeducted ? `−${r.negativeDeducted}` : '0']].map(([l, v]) => (
            <div key={l} className="card p-4"><p className="muted text-sm">{l}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{v}</p></div>
          ))}
        </div>
        <p className="muted text-xs">Accuracy is fully correct answers divided by graded attempted answers.</p>
        <section className="card p-5">
          <h2 className="font-semibold">Topic-wise performance</h2>
          <div className="mt-4 space-y-4">
            {r.topics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between gap-3 text-sm"><span>{t.topic} <span className="muted">({t.correct}/{t.questions} correct)</span></span><span className="tabular-nums">{t.percentage === null ? 'Pending' : `${t.score}/${t.total} · ${t.percentage}%`}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800"><div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, Math.max(0, t.percentage || 0))}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
        <div className="flex flex-wrap gap-2">
          {['all', ...Object.keys(STATUS)].map((k) => <button key={k} onClick={() => setFilter(k)} aria-pressed={filter === k} className={`btn btn-sm ${filter === k ? 'btn-primary' : 'btn-secondary'}`}>{k === 'all' ? `All (${a.questions.length})` : `${STATUS[k][0]} (${r.counts[k]})`}</button>)}
        </div>
        {!rows.length && <p className="muted text-sm">No questions in this group.</p>}
        {rows.map(({ q, number, item }) => (
          <article key={q.id} className="card space-y-3 p-5 text-sm">
            <div className="flex flex-wrap justify-between gap-2"><span className={`font-semibold ${STATUS[item.status][1]}`}>Q{number} · {STATUS[item.status][0]}</span><span className="muted">{TYPE_LABELS[q.type]} · {item.awarded} / {q.marks}</span></div>
            <p className="text-base break-words whitespace-pre-wrap">{q.text}</p>
            <p className="break-words"><strong>Your answer:</strong> {formatAnswer(q, a.answers[q.id])}</p>
            <p><strong>{q.type === 'short' ? 'Model answer' : 'Correct answer'}:</strong> {formatAnswer(q, q.correctAnswer)}</p>
            <p className="rounded-lg bg-zinc-100 p-3 dark:bg-zinc-800"><strong>{a.mode === 'ai' ? (q.edited ? 'Explanation (edited)' : 'AI explanation') : 'Sample explanation'}:</strong> {q.explanation}</p>
            {q.type === 'short' && (
              <div><strong>Rubric</strong>
                <ul className="mt-1 list-disc pl-5">
                  {item.breakdown ? item.breakdown.map((b, i) => <li key={i}>{b.point}: <strong>{b.awarded}/{b.max}</strong>. {b.reason}</li>)
                    : q.rubric.map((x, i) => <li key={i}>{x.point} (weight {x.weight})</li>)}
                </ul>
              </div>
            )}
            {item.feedback && <p className="muted">{item.gradedBy === 'ai' ? 'AI feedback (please verify): ' : ''}{item.feedback}</p>}
            {item.status === 'pending' && <SelfGrade q={q} busy={busy === q.id} canRetry={a.mode === 'ai'} onGrade={(marks) => grade(q, 'self-grade', { marks })} onRetry={() => grade(q, 'regrade')} />}
          </article>
        ))}
      </div>
    </>
  );
}
