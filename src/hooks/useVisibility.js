import { useState, useEffect, useRef, useCallback } from 'react';
import { makeFieldTransform } from '../utils/helpers';
import { bunkerByAbbr } from '../utils/theme';

export function useVisibility() {
  const workerRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(null);
  const [visData, setVisData] = useState(null);       // { safe, arc, exposed, cols, rows, ... }
  const [pathResult, setPathResult] = useState(null);
  const [counterData, setCounterData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL('../workers/ballisticsEngine.js', import.meta.url),
        { type: 'module' }
      );
      workerRef.current.onmessage = (e) => {
        const { type, payload } = e.data;
        if (type === 'FIELD_READY') { setIsReady(true); setProgress(null); }
        else if (type === 'PROGRESS') setProgress(payload);
        else if (type === 'VIS_RESULT') { setVisData(payload); setProgress(null); }
        else if (type === 'PATH_RESULT') { setPathResult(payload); setProgress(null); }
        else if (type === 'COUNTER_RESULT') { setCounterData(payload); setProgress(null); }
        else if (type === 'ERROR') { setError(payload.message); setProgress(null); }
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

  // Query visibility from a bunker or free point
  // stanceOverride: 'standing' | 'kneeling' | 'prone' | null (auto)
  const queryVis = useCallback((bunkerId = null, pos = null, stanceOverride = null) => {
    if (!workerRef.current || !isReady) return;
    setProgress({ phase: 'vis', pct: 0 }); setVisData(null);
    workerRef.current.postMessage({
      type: 'QUERY_VIS',
      payload: { bunkerId, pos, stanceOverride },
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
  const clearVis = useCallback(() => { setVisData(null); }, []);

  return {
    isReady, progress, visData, pathResult, counterData, error,
    initField, queryVis, analyzePath, analyzeCounter, clearCounter, clearVis,
  };
}

// ─── Convenience wrappers used by pages ────────────────────────────────────
// Handles calibration: transforms image-space coords ↔ field-space for worker.

export function useVisibilityPage() {
  const hook = useVisibility();
  const transformRef = useRef(null);

  const initFromLayout = useCallback((bunkers, calibration = null, fieldW = 45.7, fieldH = 36.6) => {
    if (!bunkers?.length) return;
    const t = makeFieldTransform(calibration);
    transformRef.current = t;

    hook.initField(bunkers.map(b => {
      // Transform bunker position from image-space to field-space
      const pos = t ? t.toField(b.x, b.y) : { x: b.x, y: b.y };
      const type = b.baType || b.type || 'Br';
      return {
        id: b.id, x: pos.x, y: pos.y,
        name: b.name || b.id,
        type,
        heightM: b.heightM || 1.0,
        widthM: b.widthM || undefined,  // let worker use SIZES fallback if missing
        depthM: b.depthM || undefined,
        shape: (type === 'C' || type === 'Tr') ? 'circle' : 'rect',
      };
    }), fieldW, fieldH, 4);
  }, [hook.initField]);

  // Wrap queryVis to transform image-space pos to field-space
  const queryVisWrapped = useCallback((bunkerId = null, pos = null, stanceOverride = null) => {
    const t = transformRef.current;
    const fieldPos = (pos && t) ? t.toField(pos.x, pos.y) : pos;
    hook.queryVis(bunkerId, fieldPos, stanceOverride);
  }, [hook.queryVis]);

  // Wrap analyzeCounter to transform image-space paths/positions
  const analyzeCounterWrapped = useCallback((enemyPath, myBase, enemySpeed = 6.5, mySpeed = 6.5) => {
    const t = transformRef.current;
    const fieldPath = t ? enemyPath.map(p => t.toField(p.x, p.y)) : enemyPath;
    const fieldBase = (t && myBase) ? t.toField(myBase.x, myBase.y) : myBase;
    hook.analyzeCounter(fieldPath, fieldBase, enemySpeed, mySpeed);
  }, [hook.analyzeCounter]);

  return {
    ...hook,
    visibilityData: hook.visData,
    isLoading: !!hook.progress,
    initFromLayout,
    queryVis: queryVisWrapped,
    analyzeCounter: analyzeCounterWrapped,
    // Expose transform so FieldCanvas can map heatmap grid back to image-space
    fieldTransform: transformRef.current,
  };
}
