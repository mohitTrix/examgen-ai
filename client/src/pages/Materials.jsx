import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye, FileText, Trash2 } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import MaterialUploader from '../components/MaterialUploader.jsx';
import { Button, Confirm, Empty, ErrorBox, Modal, PageHeader, Skeleton } from '../components/ui.jsx';
import { date } from '../utils/format.js';

export default function Materials() {
  const { data, error, loading, reload } = useFetch('/materials');
  const [preview, setPreview] = useState(null);
  const [doomed, setDoomed] = useState(null);
  const [actionError, setActionError] = useState('');
  const run = async (fn) => {
    setActionError('');
    try { await fn(); } catch (e) { setActionError(errorMessage(e)); }
  };
  return (
    <>
      <PageHeader title="Study material" subtitle="Only the extracted text is stored. Original files are discarded."><Link to="/create" className="btn btn-primary">Create exam</Link></PageHeader>
      <div className="space-y-4">
        <MaterialUploader onUploaded={reload} />
        <ErrorBox message={error || actionError} onRetry={error ? reload : undefined} />
        {loading && !data && <Skeleton />}
        {data && !data.materials.length && <Empty icon={FileText} title="Nothing uploaded yet" text="Upload notes or a chapter to generate questions from it." />}
        {data?.materials.map((m) => (
          <div key={m.id} className="card flex flex-wrap items-center gap-3 p-4">
            <FileText size={20} className="muted" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{m.filename}</p><p className="muted text-xs">{m.charCount.toLocaleString()} characters{m.truncated ? ' (truncated)' : ''} · {date(m.createdAt)}</p></div>
            <Button variant="secondary" className="btn-sm" onClick={() => run(async () => setPreview((await api.get(`/materials/${m.id}`)).data.material))}><Eye size={14} />Preview</Button>
            <Button variant="danger" className="btn-sm" onClick={() => setDoomed(m)} aria-label={`Delete ${m.filename}`}><Trash2 size={14} /></Button>
          </div>
        ))}
      </div>
      <Modal open={!!preview} title={preview?.filename} onClose={() => setPreview(null)} wide>
        <pre className="max-h-96 overflow-auto font-sans text-sm whitespace-pre-wrap">{preview?.preview}</pre>
        <div className="mt-4 flex justify-end"><Button variant="secondary" onClick={() => setPreview(null)}>Close</Button></div>
      </Modal>
      <Confirm open={!!doomed} title="Delete material?" text="Existing papers stay, but you will not be able to regenerate questions that rely on this file." confirmLabel="Delete" onClose={() => setDoomed(null)}
        onConfirm={() => run(async () => { const id = doomed.id; setDoomed(null); await api.delete(`/materials/${id}`); reload(); })} />
    </>
  );
}
