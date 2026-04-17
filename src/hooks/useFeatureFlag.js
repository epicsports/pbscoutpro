import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useWorkspace } from './useWorkspace';
import { STATIC_FLAGS, DYNAMIC_FLAG_DEFAULTS, isInAudience, ADMIN_EMAILS } from '../utils/featureFlags';

let cachedFlags = null;

function getRole(user, workspace) {
  if (!user) return 'guest';
  if (user.email && ADMIN_EMAILS.includes(user.email)) return 'admin';
  if (workspace?.role) return workspace.role;
  return 'scout';
}

export function useFeatureFlag(flagName) {
  const { user, workspace, basePath } = useWorkspace();
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
  const role = getRole(user, workspace);
  return isInAudience(config.audience, role, user);
}

export function useAllFlags() {
  const { user, workspace, basePath } = useWorkspace();
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

  const role = getRole(user, workspace);
  return Object.entries(flags).map(([name, config]) => ({
    name,
    enabled: config.enabled,
    audience: config.audience,
    visibleToMe: config.enabled && isInAudience(config.audience, role, user),
  }));
}
