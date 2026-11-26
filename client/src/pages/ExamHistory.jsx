import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FileText, History, PlayCircle, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Button, Confirm, Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui.jsx';
import { date } from '../utils/format.js';

export default function ExamHistory() {
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'attempts' ? 'attempts' : 'papers';
  return (
    <>
      <PageHeader title="Exam history" subtitle="Your 100 most recent papers and attempts." />
      <div className="mb-4 flex gap-2">
        {[['papers', 'Question papers'], ['attempts', 'Attempts and results']].map(([k, l]) => <button key={k} className={`btn ${tab === k ? 'btn-primary' : 'btn-secondary'}`} aria-pressed={tab === k} onClick={() => setParams({ tab: k })}>{l}</button>)}
      </div>
      <List key={tab} tab={tab} />
    </>
  );
}

function List({ tab }) {
  const navigate = useNavigate();
  const { data, error, reload } = useFetch(`/${tab}`);
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState('');
  const [doomed, setDoomed] = useState(null);
  const [starting, setStarting] = useState('');
  if (error) return <ErrorBox message={error} onRetry={reload} />;
  if (!data) return <Skeleton />;
  const items = data[tab].filter((x) => x.title.toLowerCase().includes(query.toLowerCase()));

  async function attempt(paperId) {
    setStarting(paperId);
    setActionError('');
    try { navigate(`/exam/${(await api.post('/attempts', { paperId })).data.attempt._id}`); }
    catch (e) { setActionError(errorMessage(e)); setStarting(''); }
  }
  async function remove() {
    const id = doomed;
    setDoomed(null);
    try { await api.delete(`/papers/${id}`); reload(); } catch (e) { setActionError(errorMessage(e)); }
  }

  return (
    <div className="space-y-3">
      <input className="input" placeholder="Search by title" aria-label="Search by title" value={query} onChange={(e) => setQuery(e.target.value)} />
      <ErrorBox message={actionError} />
      {!items.length && <Empty icon={History} title={query ? 'No matches' : 'Nothing here yet'} text={query ? 'Try a different search.' : tab === 'papers' ? 'Generated papers appear here.' : 'Attempted exams appear here.'}>{!query && <Link className="btn btn-primary" to={tab === 'papers' ? '/create' : '/history'}>{tab === 'papers' ? 'Create exam' : 'View papers'}</Link>}</Empty>}
      {items.map((x) => (
        <div key={x._id} className="card flex flex-wrap items-center gap-3 p-4">
          <div className="min-w-0 flex-1 basis-56">
            <p className="truncate font-medium">{x.title}</p>
            <p className="muted text-xs">
              {tab === 'papers' ? `${x.subject} · ${x.questionCount} questions · ${x.totalMarks} marks · ${date(x.createdAt)}`
                : `${date(x.startedAt)} · ${x.status === 'submitted' ? `${x.result.score}/${x.result.total} (${x.result.percentage}%)${x.result.pendingMarks ? ', provisional' : ''}` : x.status === 'evaluating' ? 'Evaluating' : 'In progress'}`}
            </p>
          </div>
          {tab === 'papers' ? (
            <>
              <Link className="btn btn-secondary btn-sm" to={`/papers/${x._id}`}><FileText size={14} />View</Link>
              <Button className="btn-sm" busy={starting === x._id} onClick={() => attempt(x._id)}><PlayCircle size={14} />Attempt</Button>
              <Button variant="danger" className="btn-sm" aria-label={`Delete ${x.title}`} onClick={() => setDoomed(x._id)}><Trash2 size={14} /></Button>
            </>
          ) : x.status === 'in_progress' ? (
            <Link className="btn btn-primary btn-sm" to={`/exam/${x._id}`}>Resume</Link>
          ) : (
            <>
              <Link className="btn btn-secondary btn-sm" to={`/results/${x._id}`}>Review result</Link>
              <Button className="btn-sm" busy={starting === x.paper} onClick={() => attempt(x.paper)}>Reattempt</Button>
            </>
          )}
        </div>
      ))}
      <Confirm open={!!doomed} title="Delete question paper?" text="Past results are kept, but this paper can no longer be reattempted." confirmLabel="Delete" onClose={() => setDoomed(null)} onConfirm={remove} />
    </div>
  );
}
