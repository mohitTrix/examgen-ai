import { useCallback, useEffect, useState } from 'react';
import { api, errorMessage } from '../services/api.js';

export function useFetch(url) {
  const [state, setState] = useState({ url, data: null, error: '', loading: true });
  const load = useCallback(() => {
    let live = true;
    setState((s) => ({ url, data: s.url === url ? s.data : null, error: '', loading: true }));
    api.get(url)
      .then((r) => live && setState({ url, data: r.data, error: '', loading: false }))
      .catch((e) => live && setState({ url, data: null, error: errorMessage(e), loading: false }));
    return () => { live = false; };
  }, [url]);
  useEffect(() => load(), [load]);
  const setData = (data) => setState((s) => ({ ...s, data }));
  // Never show data that belongs to a previous URL
  const current = state.url === url ? state : { data: null, error: '', loading: true };
  return { ...current, reload: load, setData };
}
