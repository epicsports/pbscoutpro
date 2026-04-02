import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * useVisibility — hook do BreakAnalyzer
 * v4: stanceOverride, edge-based shooter, counter analysis
 */
export function useVisibility() {
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
        new URL('../workers/ballisticsEngine.js', import.meta.url),
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

  // ─── Raw API ───────────────────────────────────────────────────────
  const initField = useCallback((bunkers, fieldW, fieldH, res = 4, calibration = null) => {
    if (!workerRef.current) return;
    setIsReady(false); setProgress({ phase: 'init', pct: 0 });
    // BUG 4: pass calibration to worker for future use
    workerRef.current.postMessage({ type: 'INIT_FIELD', payload: { fieldW, fieldH, bunkers, res, calibration } });
  }, []);

  const queryVis = useCallback((bunkerId = null, pos = null, barrelH = null, bunkerType = null, stanceOverride = null) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'vis', pct: 0 }); setVisData(null);
    workerRef.current.postMessage({
      type: 'QUERY_VIS',
      payload: { bunkerId, pos, barrelH, bunkerType, stanceOverride },
    });
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

  // ─── Convenience wrappers (used by pages) ──────────────────────────
  /**
   * Inicjuje pole z danych layoutu Firestore.
   * bunkers: tablica z baType, heightM, x/y znormalizowane (0-1)
   * calibration: { homeBase:{x,y}, awayBase:{x,y} } | null — BUG 4
   */
  const initFromLayout = useCallback((bunkers, fieldW = 45.7, fieldH = 36.6, calibration = null) => {
    if (!workerRef.current || !bunkers?.length) return;
    // Mapuj baType → type (worker używa 'type' do HEIGHTS/SIZES lookup)
    const mapped = bunkers.map(b => ({ ...b, type: b.baType || b.type || 'Br' }));
    initField(mapped, fieldW, fieldH, 4, calibration);
  }, [initField]);

  /**
   * Zapytaj o widoczność z bunkra lub pozycji 0-1.
   * stanceOverride: 'standing'|'kneeling'|'prone'|null
   */
  const query = useCallback((bunkerId, normPos = null, stanceOverride = null) => {
    if (!workerRef.current || !isReady) return;
    queryVis(bunkerId ?? null, normPos, null, null, stanceOverride);
  }, [isReady, queryVis]);

  return {
    isReady,
    isLoading: !!progress,
    progress,
    visibilityData: visData,   // { safe, risky, cols, rows, stance, barrelH, isSnake }
    pathResult,
    counterData,               // { bumpGrid, bumpCols, bumpRows, counters }
    error,
    // raw
    initField, queryVis,
    // wrappers
    initFromLayout, query,
    analyzeCounter, clearCounter,
  };
}
