import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Clock, Flag } from 'lucide-react';
import { useExamSession } from '../hooks/useExamSession.js';
import AnswerInput from '../components/AnswerInput.jsx';
import { Button, Confirm, DemoNotice, ErrorBox, Skeleton } from '../components/ui.jsx';
import { TYPE_HINTS, TYPE_LABELS, clock } from '../utils/format.js';

const SAVE_TEXT = {
  saved: 'Answers saved', saving: 'Saving…', offline: 'Offline: kept on this device, retrying',
  conflict: 'This exam changed in another tab. Reload this page.', closed: 'Exam is closed on the server',
};
const answered = (a) => a !== undefined && !(Array.isArray(a) && !a.length) && !(typeof a === 'string' && !a.trim());

export default function ExamRoom() {
  const { id } = useParams();
  const navigate = useNavigate();
  const s = useExamSession(id, (x) => navigate(`/results/${x}`, { replace: true }));
  const [confirming, setConfirming] = useState(false);

  if (s.loadError) return <div className="mx-auto max-w-xl p-6"><ErrorBox message={s.loadError} onRetry={s.reload} /></div>;
  if (!s.attempt || s.remaining === null) return <div className="mx-auto max-w-3xl p-6"><Skeleton /></div>;

  const { questions } = s.attempt;
  const { current, answers, marked } = s.state;
  const q = questions[current];
  const go = (i) => s.update((st) => ({ ...st, current: i }));
  const setAnswer = (value) => s.update((st) => ({ ...st, answers: { ...st.answers, [q.id]: value } }));
  const clear = () => s.update((st) => { const next = { ...st.answers }; delete next[q.id]; return { ...st, answers: next }; });
  const flag = () => s.update((st) => ({ ...st, marked: st.marked.includes(q.id) ? st.marked.filter((x) => x !== q.id) : [...st.marked, q.id] }));
  const count = questions.filter((x) => answered(answers[x.id])).length;
  const urgent = s.remaining < 60000;

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0"><h1 className="truncate font-semibold">{s.attempt.title}</h1><p className="muted text-xs" role="status">{SAVE_TEXT[s.saveStatus]}</p></div>
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-lg tabular-nums ${urgent ? 'border-red-500 text-red-600 dark:text-red-400' : 'border-zinc-300 dark:border-zinc-700'}`} role="timer" aria-label="Time remaining"><Clock size={17} />{clock(s.remaining)}</div>
          <Button onClick={() => setConfirming(true)} busy={s.submitting}>Submit</Button>
        </div>
      </header>
      <div className="mx-auto grid max-w-6xl gap-4 p-4 lg:grid-cols-[1fr_17rem]">
        <main className="space-y-4">
          {s.attempt.mode === 'demo' && <DemoNotice />}
          <ErrorBox message={s.submitError} onRetry={s.submit} />
          <div className="card p-5 sm:p-8">
            <div className="muted flex flex-wrap justify-between gap-2 text-sm"><span>Question {current + 1} of {questions.length} · {TYPE_LABELS[q.type]}</span><span>+{q.marks}{q.negativeMarks ? ` / −${q.negativeMarks}` : ''} marks</span></div>
            <p className="mt-4 mb-1 text-lg break-words whitespace-pre-wrap">{q.text}</p>
            <p className="muted mb-5 text-sm">{TYPE_HINTS[q.type]}</p>
            <fieldset disabled={s.submitting || s.remaining === 0}><AnswerInput key={q.id} question={q} value={answers[q.id]} onChange={setAnswer} /></fieldset>
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" onClick={flag} aria-pressed={marked.includes(q.id)}><Flag size={15} className={marked.includes(q.id) ? 'fill-amber-500 text-amber-500' : ''} />{marked.includes(q.id) ? 'Unmark review' : 'Mark for review'}</Button>
              <Button variant="secondary" onClick={clear} disabled={!answered(answers[q.id])}>Clear answer</Button>
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="secondary" disabled={current === 0} onClick={() => go(current - 1)}><ChevronLeft size={16} />Previous</Button>
            <Button disabled={current === questions.length - 1} onClick={() => go(current + 1)}>Next<ChevronRight size={16} /></Button>
          </div>
        </main>
        <aside className="card h-fit p-4 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">Questions</h2>
          <p className="muted mt-1 text-xs">{count} answered · {questions.length - count} unanswered · {marked.length} marked</p>
          <div className="mt-3 grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-5">
            {questions.map((x, i) => {
              const done = answered(answers[x.id]);
              const review = marked.includes(x.id);
              return <button key={x.id} onClick={() => go(i)} aria-current={i === current} aria-label={`Question ${i + 1}${done ? ', answered' : ''}${review ? ', marked for review' : ''}`}
                className={`relative h-9 cursor-pointer rounded-md border text-sm ${done ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-zinc-300 dark:border-zinc-700'} ${i === current ? 'ring-2 ring-indigo-500 ring-offset-1 dark:ring-offset-zinc-900' : ''}`}>
                {i + 1}{review && <span className="absolute -top-1 -right-1 size-3 rounded-full bg-amber-500" />}
              </button>;
            })}
          </div>
          <p className="muted mt-3 text-xs">Green: answered · Amber dot: marked for review</p>
          <Link to="/dashboard" className="muted mt-4 block text-xs underline">Leave exam (the timer keeps running)</Link>
        </aside>
      </div>
      <Confirm open={confirming} title="Submit examination?" confirmLabel="Submit exam" busy={s.submitting}
        text={<>You answered {count} of {questions.length}. {questions.length - count} unanswered and {marked.length} marked for review. You cannot change answers after submitting.</>}
        onClose={() => setConfirming(false)} onConfirm={() => { setConfirming(false); s.submit(); }} />
    </div>
  );
}
