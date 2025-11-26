import { useState, useCallback } from 'react';

// Simple hook to run async functions and expose loading state
// Usage:
// const { run, loading, error, result } = useAsync();
// await run(() => fetch(...));

export default function useAsync() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const run = useCallback(async (fn) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fn();
      setResult(res);
      return res;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return { run, loading, error, result };
}
