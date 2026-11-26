import { useCallback, useEffect, useRef, useState } from 'react';
import { api, AI, errorMessage } from '../services/api.js';

// Owns exam state: autosave, server-synchronised countdown, and submission.
export function useExamSession(id, onSubmitted) {
  const [attempt, setAttempt] = useState(null);
  const [state, setState] = useState({ answers: {}, marked: [], current: 0 });
  const [loadError, setLoadError] = useState('');
  const [saveStatus, setSaveStatus] = useState('saved');
  const [remaining, setRemaining] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const ref = useRef({ state, revision: 0, offset: 0, dirty: false, saving: null, submitting: false, lastTry: 0 });
  ref.current.state = state;
  const draftKey = `examgen.draft.${id}`;

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const { attempt: a } = (await api.get(`/attempts/${id}`, AI)).data;
      if (a.status === 'submitted') return onSubmitted(id);
      if (a.status === 'evaluating') return setLoadError('Your exam is being evaluated. Try again in a moment.');
      const r = ref.current;
      r.offset = new Date(a.serverNow).getTime() - Date.now();
      r.revision = a.revision;
      let initial = { answers: a.answers || {}, marked: a.marked || [], current: a.current || 0 };
      // A local draft newer than the server copy means a save didn't get through
      try {
        const draft = JSON.parse(localStorage.getItem(draftKey));
        if (draft?.revision > a.revision) {
          initial = draft.state;
          r.revision = draft.revision;
          r.dirty = true;
        }
      } catch { /* ignore an unreadable draft */ }
      r.state = initial;
      setState(initial);
      setAttempt(a);
    } catch (e) { setLoadError(errorMessage(e)); }
  }, [id]);
  useEffect(() => { load(); }, [load]);

  const flush = useCallback(async () => {
    const r = ref.current;
    if (!r.dirty || r.saving || r.submitting) return;
    r.dirty = false;
    setSaveStatus('saving');
    r.saving = api.put(`/attempts/${id}/progress`, { ...r.state, revision: r.revision }, { timeout: 10000 });
    try {
      const { data } = await r.saving;
      // Not saved: the server holds a newer revision (e.g. another tab)
      setSaveStatus(data.saved ? 'saved' : 'conflict');
    } catch (e) {
      r.dirty = true;
      r.revision += 1; // the server may have applied the failed request
      setSaveStatus(e.response?.status === 409 ? 'closed' : 'offline');
    }
    r.saving = null;
  }, [id]);

  const update = (fn) => {
    const r = ref.current;
    if (r.submitting) return;
    const next = fn(r.state);
    r.state = next;
    r.revision += 1;
    r.dirty = true;
    setState(next);
    try { localStorage.setItem(draftKey, JSON.stringify({ revision: r.revision, state: next })); } catch { /* storage full or blocked */ }
  };

  const submit = useCallback(async () => {
    const r = ref.current;
    if (r.submitting) return;
    r.submitting = true;
    r.lastTry = Date.now();
    setSubmitting(true);
    setSubmitError('');
    try {
      await r.saving?.catch(() => {});
      await api.post(`/attempts/${id}/submit`, r.state, AI);
      localStorage.removeItem(draftKey);
      onSubmitted(id);
    } catch (e) {
      r.submitting = false;
      setSubmitting(false);
      setSubmitError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    if (!attempt) return;
    const deadline = new Date(attempt.deadline).getTime();
    const tick = () => {
      const left = deadline - (Date.now() + ref.current.offset);
      setRemaining(Math.max(0, left));
      // Auto-submit, retrying every 5 s if the network is down
      if (left <= 0 && Date.now() - ref.current.lastTry > 5000) submit();
    };
    tick();
    const timer = setInterval(tick, 500);
    const saver = setInterval(flush, 2000);
    const leave = (e) => { if (ref.current.dirty) e.preventDefault(); };
    window.addEventListener('beforeunload', leave);
    return () => {
      clearInterval(timer);
      clearInterval(saver);
      window.removeEventListener('beforeunload', leave);
      flush();
    };
  }, [attempt, submit, flush]);

  return { attempt, state, update, remaining, saveStatus, submit, submitting, submitError, loadError, reload: load };
}
