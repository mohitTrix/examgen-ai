import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Download, Eye, EyeOff, Pencil, PlayCircle, Printer, RefreshCw } from 'lucide-react';
import { api, AI, errorMessage } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import QuestionEditor from '../components/QuestionEditor.jsx';
import { Button, Confirm, DemoNotice, ErrorBox, Modal, PageHeader, Skeleton } from '../components/ui.jsx';
import { TYPE_HINTS, TYPE_LABELS, formatAnswer, instructions, letter, sections, totalMarks } from '../utils/format.js';
import { downloadPdf } from '../utils/pdf.js';

export default function PaperPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, error, reload, setData } = useFetch(`/papers/${id}`);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const [editing, setEditing] = useState(null);
  const [confirmAll, setConfirmAll] = useState(false);

  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Skeleton rows={4} />;
  const paper = data.paper;

  async function run(key, fn) {
    setBusy(key);
    setActionError('');
    try { await fn(); } catch (e) { setActionError(errorMessage(e)); }
    setBusy('');
  }
  const replace = (key, url) => run(key, async () => setData((await api.post(url, null, AI)).data));
  const start = () => run('start', async () => navigate(`/exam/${(await api.post('/attempts', { paperId: id })).data.attempt._id}`));
  async function save(body) {
    try {
      setData((await api.put(`/papers/${id}/questions/${body.id}`, body)).data);
      setEditing(null);
    } catch (e) { return errorMessage(e); }
  }

  return (
    <>
      <PageHeader title="Question paper preview" subtitle={showKey ? 'Answer key is visible.' : 'Answer key is hidden, so you can still attempt it fairly.'}>
        <Button onClick={start} busy={busy === 'start'} disabled={!!busy}><PlayCircle size={16} />Start exam</Button>
        <Button variant="secondary" onClick={() => setShowKey(!showKey)}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}{showKey ? 'Hide answers' : 'Show answers'}</Button>
        <Button variant="secondary" busy={busy === 'pdf'} onClick={() => run('pdf', async () => downloadPdf(paper, showKey))}><Download size={16} />PDF</Button>
        <Button variant="secondary" onClick={() => window.print()}><Printer size={16} />Print</Button>
        <Button variant="secondary" busy={busy === 'all'} disabled={!!busy} onClick={() => setConfirmAll(true)}><RefreshCw size={16} />Regenerate all</Button>
      </PageHeader>
      <div className="no-print mb-4 space-y-3">
        {paper.mode === 'demo' && <DemoNotice />}
        <ErrorBox message={actionError} />
        <p className="muted text-xs">PDF and Print include the answer key only while it is visible. For non-Latin text or maths symbols, use Print and choose “Save as PDF”.</p>
      </div>
      <article className="card print-sheet p-5 sm:p-10">
        <header className="border-b-2 border-current pb-4 text-center font-paper">
          <h2 className="text-2xl font-bold break-words">{paper.title}</h2>
          <p className="mt-1">{paper.subject}</p>
          <div className="mt-3 flex flex-wrap justify-between gap-2 text-sm"><span>Time: {paper.duration} minutes</span><span>Questions: {paper.questions.length}</span><span>Maximum marks: {totalMarks(paper.questions)}</span></div>
          {paper.mode === 'demo' && <p className="mt-2 text-sm font-bold">DEMO MODE: SAMPLE QUESTIONS</p>}
        </header>
        <ul className="my-4 list-disc pl-5 font-paper text-sm">{instructions(paper).map((t) => <li key={t}>{t}</li>)}</ul>
        {sections(paper.questions).map((s) => (
          <section key={s.type}>
            <h3 className="mt-8 border-b border-zinc-300 pb-1 font-paper font-bold dark:border-zinc-700">{s.name}: {TYPE_LABELS[s.type]} <span className="text-sm font-normal">({TYPE_HINTS[s.type]})</span></h3>
            {s.items.map(({ q, number }) => (
              <div key={q.id} className="avoid-break border-b border-zinc-100 py-4 dark:border-zinc-800">
                <div className="flex items-start gap-3 font-paper">
                  <strong>Q{number}.</strong>
                  <p className="min-w-0 flex-1 break-words whitespace-pre-wrap">{q.text}</p>
                  <span className="shrink-0 text-sm">[{q.marks}{q.negativeMarks ? ` / −${q.negativeMarks}` : ''}]</span>
                </div>
                {q.options.length > 0 && <ol className="mt-2 grid gap-1 pl-9 font-paper sm:grid-cols-2">{q.options.map((o, i) => <li key={i}>({letter(i)}) {o}</li>)}</ol>}
                {showKey && (
                  <div className="mt-3 ml-9 space-y-1 rounded-lg bg-zinc-100 p-3 text-sm dark:bg-zinc-800">
                    <p><strong>Answer:</strong> {formatAnswer(q, q.correctAnswer)}</p>
                    <p><strong>Explanation:</strong> {q.explanation}</p>
                    {q.rubric?.length > 0 && <p><strong>Rubric:</strong> {q.rubric.map((r) => `${r.point} (weight ${r.weight})`).join('; ')}</p>}
                    {q.sourceQuote && <p className="no-print muted"><strong>Source passage:</strong> “{q.sourceQuote}”</p>}
                    {q.edited && <p className="no-print muted">Edited by you. The source passage may no longer match.</p>}
                  </div>
                )}
                <div className="no-print mt-2 flex flex-wrap items-center gap-2 pl-9">
                  <span className="badge">{q.difficulty}</span><span className="badge">{q.topic}</span><span className="flex-1" />
                  <Button variant="secondary" className="btn-sm" disabled={!!busy} onClick={() => setEditing(q)}><Pencil size={13} />Edit</Button>
                  <Button variant="secondary" className="btn-sm" busy={busy === q.id} disabled={!!busy} onClick={() => replace(q.id, `/papers/${id}/questions/${q.id}/regenerate`)}><RefreshCw size={13} />Regenerate</Button>
                </div>
              </div>
            ))}
          </section>
        ))}
      </article>
      <Modal open={!!editing} title="Edit question" onClose={() => setEditing(null)} wide>
        {editing && <QuestionEditor question={editing} onSave={save} onCancel={() => setEditing(null)} />}
      </Modal>
      <Confirm open={confirmAll} title="Regenerate the whole paper?" text="This replaces every question, including your edits. Past results are not affected. An exam already in progress keeps the old questions." confirmLabel="Regenerate"
        onClose={() => setConfirmAll(false)} onConfirm={() => { setConfirmAll(false); replace('all', `/papers/${id}/regenerate`); }} />
    </>
  );
}
