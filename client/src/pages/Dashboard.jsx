import { Link } from 'react-router-dom';
import { Activity, FilePlus2, FileText, History, PlayCircle, Target, UploadCloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Empty, ErrorBox, PageHeader, Skeleton } from '../components/ui.jsx';
import { date } from '../utils/format.js';

export default function Dashboard() {
  const { user } = useAuth();
  const { data, error, loading, reload } = useFetch('/stats');
  const to = (a) => (a.kind === 'generated' ? `/papers/${a.id}` : a.kind === 'completed' ? `/results/${a.id}` : `/exam/${a.id}`);
  return (
    <>
      <PageHeader title={`Hello, ${user.name.split(' ')[0]}`} subtitle="Here is your exam activity." />
      <ErrorBox message={error} onRetry={reload} />
      {loading && !data && <Skeleton />}
      {data && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[[FileText, 'Exams generated', data.totalPapers], [PlayCircle, 'Exams attempted', data.totalAttempts], [Target, 'Average score', data.averageScore === null ? '—' : `${data.averageScore}%`]].map(([Icon, label, value]) => (
              <div key={label} className="card p-5"><div className="muted flex items-center justify-between text-sm">{label}<Icon size={17} /></div><p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p></div>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[['/create', 'Create exam', FilePlus2], ['/materials', 'Upload material', UploadCloud], ['/history', 'View history', History]].map(([path, label, Icon], i) => (
              <Link key={path} to={path} className={`btn ${i ? 'btn-secondary' : 'btn-primary'} !py-3`}><Icon size={17} />{label}</Link>
            ))}
          </div>
          <section>
            <h2 className="mb-3 font-semibold">Recent activity</h2>
            {!data.activity.length ? (
              <Empty icon={Activity} title="No activity yet" text="Create your first question paper to get started."><Link to="/create" className="btn btn-primary">Create exam</Link></Empty>
            ) : (
              <ul className="card divide-y divide-zinc-200 dark:divide-zinc-800">
                {data.activity.map((a) => (
                  <li key={`${a.kind}-${a.id}`}>
                    <Link to={to(a)} className="flex items-center justify-between gap-3 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                      <div className="min-w-0"><p className="truncate text-sm font-medium">{a.title}</p><p className="muted text-xs">{{ generated: 'Paper created', completed: 'Exam completed', started: 'Exam started' }[a.kind]} · {date(a.at)}</p></div>
                      {a.percentage !== undefined && <span className="badge tabular-nums">{a.percentage}%</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
          {data.trend.length > 1 && (
            <section className="card p-5">
              <h2 className="font-semibold">Recent scores</h2>
              <div className="mt-4 flex h-32 items-end gap-2">
                {data.trend.map((t) => (
                  <Link key={t.id} to={`/results/${t.id}`} title={`${t.title}: ${t.percentage}%`} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
                    <span className="muted text-xs">{Math.round(t.percentage)}%</span>
                    <span className="w-full max-w-10 rounded-t bg-indigo-500" style={{ height: `${Math.max(2, t.percentage * 0.75)}%` }} />
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </>
  );
}
