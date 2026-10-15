import { useCallback, useEffect, useRef, useState } from 'react';
import { errMsg } from '../services/api';

/** Loads data on mount / when deps change. `silent` reloads keep existing data on screen (no skeleton flash). */
export default function useFetch(fn, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const res = await fnRef.current();
      if (alive.current) setData(res);
      return res;
    } catch (e) {
      if (alive.current) setError(errMsg(e));
      return null;
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, deps);
  return { data, setData, loading, error, reload: load };
}
