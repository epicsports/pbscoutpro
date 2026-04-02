import { useState, useEffect, useRef, useCallback } from 'react';

export function useBallisticsWorker() {
  const workerRef = useRef(null);
  const [isReady, setIsReady]         = useState(false);
  const [progress, setProgress]       = useState(null);
  const [visData, setVisData]         = useState(null);
  const [pathResult, setPathResult]   = useState(null);
  const [counterData, setCounterData] = useState(null);
  const [error, setError]             = useState(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../../workers/ballisticsEngine.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'FIELD_READY')       { setIsReady(true); setProgress(null); }
        else if (type === 'PROGRESS')     setProgress(payload);
        else if (type === 'VIS_RESULT')   { setVisData(payload); setProgress(null); }
        else if (type === 'PATH_RESULT')  { setPathResult(payload); setProgress(null); }
        else if (type === 'COUNTER_RESULT') { setCounterData(payload); setProgress(null); }
        else if (type === 'ERROR')        { setError(payload.message); setProgress(null); }
      };
      workerRef.current.onerror = (err) => { setError(err.message); };
    } catch (err) { setError('Web Worker not supported'); }
    return () => { workerRef.current?.terminate(); };
  }, []);

  const initField = useCallback((bunkers, fieldW, fieldH, res = 4) => {
    if (!workerRef.current) return;
    setIsReady(false); setProgress({ phase: 'init', pct: 0 });
    workerRef.current.postMessage({ type: 'INIT_FIELD', payload: { fieldW, fieldH, bunkers, res } });
  }, []);

  // v4: stanceOverride param ('standing'|'kneeling'|'prone'|null)
  const queryVis = useCallback((bunkerId = null, pos = null, barrelH = null, bunkerType = null, stanceOverride = null) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'vis', pct: 0 }); setVisData(null);
    workerRef.current.postMessage({
      type: 'QUERY_VIS',
      payload: { bunkerId, pos, barrelH, bunkerType, stanceOverride },
    });
  }, [isReady]);

  const analyzePath = useCallback((pathId, waypoints, speed = 6.5, shooters = []) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'path', pct: 0 }); setPathResult(null);
    workerRef.current.postMessage({ type: 'ANALYZE_PATH', payload: { pathId, waypoints, speed, shooters } });
  }, [isReady]);

  const analyzeCounter = useCallback((enemyPath, myBase, enemySpeed = 6.5, mySpeed = 6.5) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'counter-bump', pct: 0 }); setCounterData(null);
    workerRef.current.postMessage({
      type: 'ANALYZE_COUNTER',
      payload: { enemyPath, enemySpeed, myBase, mySpeed, rof: 8 },
    });
  }, [isReady]);

  const clearCounter = useCallback(() => { setCounterData(null); }, []);

  return {
    isReady, progress, visData, pathResult, counterData, error,
    initField, queryVis, analyzePath, analyzeCounter, clearCounter,
  };
}
