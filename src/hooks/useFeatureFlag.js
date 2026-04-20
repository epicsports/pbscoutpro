import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useWorkspace } from './useWorkspace';
import { useViewAs } from './useViewAs';
import { STATIC_FLAGS, DYNAMIC_FLAG_DEFAULTS, isInAudience } from '../utils/featureFlags';

let cachedFlags = null;

// Multi-role-aware resolver (§ 38.5). Roles come from useViewAs so that an
// admin impersonating a non-admin role sees only flags visible to that role.
// Admin status is the "effective" admin — impersonation collapses it.
function getRoles(roles, isAdmin) {
  const base = Array.isArray(roles) ? [...roles] : [];
  if (isAdmin && !base.includes('admin')) base.unshift('admin');
  return base.length > 0 ? base : ['guest'];
}

export function useFeatureFlag(flagName) {
  const { user, basePath } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
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
  const userRoles = getRoles(effectiveRoles, effectiveIsAdmin);
  return userRoles.some(r => isInAudience(config.audience, r, user));
}

export function useAllFlags() {
  const { user, basePath } = useWorkspace();
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
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

  const userRoles = getRoles(effectiveRoles, effectiveIsAdmin);
  return Object.entries(flags).map(([name, config]) => ({
    name,
    enabled: config.enabled,
    audience: config.audience,
    visibleToMe: config.enabled && userRoles.some(r => isInAudience(config.audience, r, user)),
  }));
}
