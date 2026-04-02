import { useState, useEffect, useRef, useCallback } from 'react';

export function useBallisticsWorker() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(null);
  const [visData, setVisData] = useState(null);
  const [pathResult, setPathResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('./workers/ballisticsEngine.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'FIELD_READY') { setIsReady(true); setProgress(null); }
        else if (type === 'PROGRESS') setProgress(payload);
        else if (type === 'VIS_RESULT') { setVisData(payload); setProgress(null); }
        else if (type === 'PATH_RESULT') { setPathResult(payload); setProgress(null); }
        else if (type === 'ERROR') { setError(payload.message); setProgress(null); }
      };
      workerRef.current.onerror = (err) => { setError(err.message); };
    } catch (err) { setError('Web Worker not supported'); }
    return () => { workerRef.current?.terminate(); };
  }, []);

  const initField = useCallback((bunkers, fieldW, fieldH, res = 2) => {
    if (!workerRef.current) return;
    setIsReady(false); setProgress({ phase: 'init', pct: 0 });
    workerRef.current.postMessage({ type: 'INIT_FIELD', payload: { fieldW, fieldH, bunkers, res } });
  }, []);

  const queryVis = useCallback((bunkerId = null, pos = null, barrelH = 1.3) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'vis', pct: 0 }); setVisData(null);
    workerRef.current.postMessage({ type: 'QUERY_VIS', payload: { bunkerId, pos, barrelH } });
  }, [isReady]);

  const analyzePath = useCallback((pathId, waypoints, speed = 6.5, shooters = []) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'path', pct: 0 }); setPathResult(null);
    workerRef.current.postMessage({ type: 'ANALYZE_PATH', payload: { pathId, waypoints, speed, shooters } });
  }, [isReady]);

  return { isReady, progress, visData, pathResult, error, initField, queryVis, analyzePath };
}
