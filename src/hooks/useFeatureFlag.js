import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useWorkspace } from './useWorkspace';
import { STATIC_FLAGS, DYNAMIC_FLAG_DEFAULTS, isInAudience } from '../utils/featureFlags';

let cachedFlags = null;

// Multi-role-aware resolver. Returns array of roles from useWorkspace. If the
// user is admin via any path (array includes 'admin', or adminUid match, or
// ADMIN_EMAILS allowlist), we prepend 'admin' to ensure audience checks see it.
function getRoles(roles, isAdmin) {
  const base = Array.isArray(roles) ? [...roles] : [];
  if (isAdmin && !base.includes('admin')) base.unshift('admin');
  return base.length > 0 ? base : ['guest'];
}

export function useFeatureFlag(flagName) {
  const { user, roles, isAdmin, basePath } = useWorkspace();
  const [flags, setFlags] = useState(cachedFlags || DYNAMIC_FLAG_DEFAULTS);

  if (flagName in STATIC_FLAGS) {
    return STATIC_FLAGS[flagName];
  }

  useEffect(() => {
    if (!basePath) return;
    const ref = doc(db, basePath, 'config', 'featureFlags');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const merged = { ...DYNAMIC_FLAG_DEFAULTS };
      Object.keys(merged).forEach(key => {
        if (data[key] != null) merged[key] = data[key];
      });
      cachedFlags = merged;
      setFlags(merged);
    }, () => {
      setFlags(DYNAMIC_FLAG_DEFAULTS);
    });
    return unsub;
  }, [basePath]);

  const config = flags[flagName];
  if (!config) {
    if (import.meta.env.DEV) {
      console.warn(`[FeatureFlag] Unknown flag: ${flagName}`);
    }
    return false;
  }

  if (!config.enabled) return false;
  // Any of the user's roles satisfying the audience grants visibility.
  const userRoles = getRoles(roles, isAdmin);
  return userRoles.some(r => isInAudience(config.audience, r, user));
}

export function useAllFlags() {
  const { user, roles, isAdmin, basePath } = useWorkspace();
  const [flags, setFlags] = useState(cachedFlags || DYNAMIC_FLAG_DEFAULTS);

  useEffect(() => {
    if (!basePath) return;
    const ref = doc(db, basePath, 'config', 'featureFlags');
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data() || {};
      const merged = { ...DYNAMIC_FLAG_DEFAULTS };
      Object.keys(merged).forEach(key => {
        if (data[key] != null) merged[key] = data[key];
      });
      setFlags(merged);
    });
    return unsub;
  }, [basePath]);

  const userRoles = getRoles(roles, isAdmin);
  return Object.entries(flags).map(([name, config]) => ({
    name,
    enabled: config.enabled,
    audience: config.audience,
    visibleToMe: config.enabled && userRoles.some(r => isInAudience(config.audience, r, user)),
  }));
}
