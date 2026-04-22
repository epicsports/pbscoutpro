import { useEffect, useRef, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

// Process-wide cache so we only read each user doc once per session.
const _cache = new Map();
const _inflight = new Map();
const _profileCache = new Map();
const _profileInflight = new Map();

/**
 * Invalidate cached name for a user — call after updating their profile
 * so the next read fetches the fresh value.
 */
export function invalidateUserName(uid) {
  _cache.delete(uid);
  _inflight.delete(uid);
  _profileCache.delete(uid);
  _profileInflight.delete(uid);
}

function fetchName(uid) {
  if (_cache.has(uid)) return Promise.resolve(_cache.get(uid));
  if (_inflight.has(uid)) return _inflight.get(uid);
  const p = getDoc(doc(db, 'users', uid))
    .then(snap => {
      const name = snap.exists()
        ? (snap.data().displayName || snap.data().email || 'Scout')
        : null;
      _cache.set(uid, name);
      _inflight.delete(uid);
      return name;
    })
    .catch(() => { _inflight.delete(uid); return null; });
  _inflight.set(uid, p);
  return p;
}

/**
 * Given an array of Firebase user IDs, returns a { [uid]: displayName } map.
 * Missing / unknown UIDs are rendered as a short token when displayed elsewhere.
 * Values are cached across calls in this tab.
 */
export function useUserNames(uids) {
  const [names, setNames] = useState(() => {
    const init = {};
    (uids || []).forEach(uid => { if (uid && _cache.has(uid)) init[uid] = _cache.get(uid); });
    return init;
  });
  const key = (uids || []).filter(Boolean).sort().join(',');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const unique = [...new Set((uids || []).filter(Boolean))];
    if (!unique.length) return;
    const missing = unique.filter(u => !_cache.has(u));
    if (!missing.length) {
      // Hydrate from cache only.
      setNames(prev => {
        const next = { ...prev };
        let changed = false;
        unique.forEach(u => {
          if (_cache.has(u) && next[u] !== _cache.get(u)) {
            next[u] = _cache.get(u);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      return;
    }
    Promise.all(missing.map(fetchName)).then(() => {
      if (!mountedRef.current) return;
      setNames(() => {
        const next = {};
        unique.forEach(u => { next[u] = _cache.get(u); });
        return next;
      });
    });
  }, [key]);

  return names;
}

/**
 * Short, human-friendly fallback when a UID has no user profile.
 * Used for legacy anonymous scouts.
 */
export function fallbackScoutLabel(uid) {
  if (!uid) return 'Unknown';
  return `Scout ${uid.slice(0, 4)}`;
}

// ─── useUserProfiles ───────────────────────────────────────────────
// Cousin of useUserNames that returns the full {displayName, email,
// photoURL} shape. Used by surfaces (MembersPage, identity pills) that
// need to render email as a secondary line or as a displayName fallback.
// Same Firestore path, independent cache — keep useUserNames semantics
// (returning a bare string) untouched.

function fetchProfile(uid) {
  if (_profileCache.has(uid)) return Promise.resolve(_profileCache.get(uid));
  if (_profileInflight.has(uid)) return _profileInflight.get(uid);
  const p = getDoc(doc(db, 'users', uid))
    .then(snap => {
      const data = snap.exists() ? snap.data() : null;
      const profile = data ? {
        displayName: data.displayName || null,
        email: data.email || null,
        photoURL: data.photoURL || null,
      } : null;
      _profileCache.set(uid, profile);
      _profileInflight.delete(uid);
      return profile;
    })
    .catch(() => { _profileInflight.delete(uid); return null; });
  _profileInflight.set(uid, p);
  return p;
}

/**
 * Given an array of Firebase user IDs, returns a { [uid]: { displayName,
 * email, photoURL } | null } map. Missing docs resolve to null entries so
 * callers can apply their own fallback label.
 */
export function useUserProfiles(uids) {
  const [profiles, setProfiles] = useState(() => {
    const init = {};
    (uids || []).forEach(uid => {
      if (uid && _profileCache.has(uid)) init[uid] = _profileCache.get(uid);
    });
    return init;
  });
  const key = (uids || []).filter(Boolean).sort().join(',');
  const mountedRef = useRef(true);
  useEffect(() => () => { mountedRef.current = false; }, []);

  useEffect(() => {
    const unique = [...new Set((uids || []).filter(Boolean))];
    if (!unique.length) return;
    const missing = unique.filter(u => !_profileCache.has(u));
    if (!missing.length) {
      setProfiles(prev => {
        const next = { ...prev };
        let changed = false;
        unique.forEach(u => {
          if (_profileCache.has(u) && next[u] !== _profileCache.get(u)) {
            next[u] = _profileCache.get(u);
            changed = true;
          }
        });
        return changed ? next : prev;
      });
      return;
    }
    Promise.all(missing.map(fetchProfile)).then(() => {
      if (!mountedRef.current) return;
      setProfiles(() => {
        const next = {};
        unique.forEach(u => { next[u] = _profileCache.get(u) || null; });
        return next;
      });
    });
  }, [key]);

  return profiles;
}
