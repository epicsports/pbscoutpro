/**
 * Feature flags — hybrid system.
 *
 * STATIC FLAGS: hardcoded here, change requires deploy.
 * DYNAMIC FLAGS: stored in Firestore /workspaces/{slug}/config/featureFlags
 * AUDIENCE: 'all' | 'beta' | 'admin'
 */

export const STATIC_FLAGS = {
  ENABLE_CONCURRENT_EDITING: true,
  ENABLE_VISION_API: true,
  ENABLE_BALLISTICS: true,
  DEBUG_PANEL: import.meta.env.DEV,
  LOG_PERFORMANCE: import.meta.env.DEV,
};

export const DYNAMIC_FLAG_DEFAULTS = {
  coachBrief:        { enabled: false, audience: 'beta' },
  perPlayerShots:    { enabled: false, audience: 'beta' },
  accuracyMetric:    { enabled: false, audience: 'beta' },
  confidenceBadge:   { enabled: false, audience: 'all' },
  multiScoutSession: { enabled: false, audience: 'beta' },
  layoutNotesTagged: { enabled: false, audience: 'beta' },
  videoCV:           { enabled: false, audience: 'admin' },
  predictiveEngine:  { enabled: false, audience: 'admin' },
};

export const ADMIN_EMAILS = ['jacek@epicsports.pl'];

export function isAdmin(user) {
  return user?.email && ADMIN_EMAILS.includes(user.email);
}

export function isInAudience(audience, userRole, user) {
  if (audience === 'all') return true;
  if (audience === 'beta') return ['scout', 'coach', 'admin'].includes(userRole);
  if (audience === 'admin') return userRole === 'admin' || isAdmin(user);
  return false;
}
