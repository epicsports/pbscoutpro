import React, { createContext, useContext, useState, useRef, useCallback } from 'react';

const SaveContext = createContext(null);

/**
 * Global save status provider.
 * States: 'idle' | 'saving' | 'saved' | 'error'
 */
export function SaveStatusProvider({ children }) {
  const [status, setStatus] = useState('idle');
  const timerRef = useRef(null);

  const markSaving = useCallback(() => {
    clearTimeout(timerRef.current);
    setStatus('saving');
  }, []);

  const markSaved = useCallback(() => {
    setStatus('saved');
    timerRef.current = setTimeout(() => setStatus('idle'), 2500);
  }, []);

  const markError = useCallback(() => {
    setStatus('error');
    timerRef.current = setTimeout(() => setStatus('idle'), 4000);
  }, []);

  return (
    <SaveContext.Provider value={{ status, markSaving, markSaved, markError }}>
      {children}
    </SaveContext.Provider>
  );
}

export function useSaveStatus() {
  const ctx = useContext(SaveContext);
  if (!ctx) throw new Error('useSaveStatus must be inside SaveStatusProvider');
  return ctx;
}

/**
 * Wraps an async save function with automatic status tracking.
 * Usage: const tracked = useTrackedSave(); await tracked(() => ds.updateLayout(...));
 */
export function useTrackedSave() {
  const { markSaving, markSaved, markError } = useSaveStatus();
  return useCallback(async (fn) => {
    markSaving();
    try {
      await fn();
      markSaved();
    } catch (e) {
      markError();
      throw e;
    }
  }, [markSaving, markSaved, markError]);
}
