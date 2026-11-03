import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Generic data-fetching hook with loading / error / refetch.
 * `fetcher` must return the API envelope ({ data, meta }).
 * Re-runs whenever `deps` change; ignores responses from stale requests.
 */
export function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, meta: null, loading: true, error: null });
  const requestId = useRef(0);

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const res = await fetcher();
      if (id === requestId.current) setState({ data: res.data, meta: res.meta || null, loading: false, error: null });
    } catch (err) {
      if (id === requestId.current) setState((s) => ({ ...s, loading: false, error: err.message || 'Something went wrong' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}
