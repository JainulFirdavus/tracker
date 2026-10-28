import { useEffect, useState } from 'react';
import { request } from '../lib/api';

export function useTrackerStatus(enabled) {
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    let timer;
    async function refresh() {
      try {
        const next = await request('/api/status', { signal: controller.signal });
        if (!controller.signal.aborted) { setStatus(next); setError(''); }
      } catch (failure) {
        if (failure.name !== 'AbortError') setError(failure.message);
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 1000);
      }
    }
    refresh();
    return () => { controller.abort(); clearTimeout(timer); };
  }, [enabled]);
  return { status, error };
}