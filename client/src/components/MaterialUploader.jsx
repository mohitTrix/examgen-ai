import { useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { api, errorMessage } from '../services/api.js';
import { ErrorBox, Spinner } from './ui.jsx';

export default function MaterialUploader({ onUploaded }) {
  const input = useRef(null);
  const [state, setState] = useState({ busy: false, progress: 0, error: '' });
  const [over, setOver] = useState(false);

  async function send(list) {
    const files = [...list];
    if (!files.length || state.busy) return;
    const fail = (error) => setState({ busy: false, progress: 0, error });
    if (files.length > 3) return fail('Upload at most 3 files at a time.');
    if (files.some((f) => !/\.(pdf|docx|txt)$/i.test(f.name))) return fail('Only PDF, DOCX and TXT files are allowed.');
    if (files.some((f) => f.size > 10 * 1024 * 1024)) return fail('Each file must be 10 MB or smaller.');
    const form = new FormData();
    files.forEach((f) => form.append('files', f));
    setState({ busy: true, progress: 0, error: '' });
    try {
      const { data } = await api.post('/materials', form, {
        timeout: 180000,
        onUploadProgress: (e) => setState((s) => ({ ...s, progress: Math.round((e.loaded / (e.total || 1)) * 100) })),
      });
      setState({ busy: false, progress: 0, error: '' });
      onUploaded(data.materials);
    } catch (e) {
      fail(errorMessage(e));
    }
  }

  return (
    <div className="space-y-3">
      <button type="button" onClick={() => input.current.click()}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); send(e.dataTransfer.files); }}
        className={`flex w-full cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-sm transition-colors ${over ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950' : 'border-zinc-300 dark:border-zinc-700'}`}>
        {state.busy ? <Spinner size={24} /> : <UploadCloud />}
        <span className="font-medium">{state.busy ? (state.progress < 100 ? `Uploading ${state.progress}%` : 'Reading your documents…') : 'Drop files here or click to browse'}</span>
        <span className="muted text-xs">PDF, DOCX or TXT · up to 3 files · 10 MB each · scanned images are not supported</span>
      </button>
      <input ref={input} type="file" hidden multiple accept=".pdf,.docx,.txt" onChange={(e) => { send(e.target.files); e.target.value = ''; }} />
      <ErrorBox message={state.error} />
    </div>
  );
}
