/**
 * Feature flags — hybrid system.
 *
 * STATIC FLAGS: hardcoded here, change requires deploy.
 * DYNAMIC FLAGS: stored in Firestore /workspaces/{slug}/config/featureFlags
 * AUDIENCE: 'all' | 'beta' | 'admin'
 */

export const STATIC_FLAGS = {
  ENABLE_CONCURRENT_EDITING: true,
  // DISABLED 2026-05-20 per DESIGN_DECISIONS § 65 / Q3 resolution.
  // Gates THREE client-side Anthropic API call sites that bundled the
  // user's API key from localStorage (VisionScan + OCRBunkerDetect +
  // ScheduleImport). Per § 65.5 anti-pattern "Bundle Anthropic API key
  // in client bundle" — client-side AI features are paused until
  // server-side Cloud Functions migration (Phase 3+ post permissions).
  // Wire: VisionScan/OCRBunkerDetect/ScheduleImport early-return when
  // false; LayoutWizardPage hides Vision Scan step; LayoutDetailPage
  // gates the dead-code OCRBunkerDetect render; ScoutTabContent hides
  // the "Import schedule (zdjęcie)" Btn. Code preserved behind flag.
  ENABLE_VISION_API: false,
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

// ADMIN_EMAILS single source of truth lives in roleUtils (§ 38). Import it
// here for the 'admin' audience email-fallback check — keeps feature-flag
// admin audience in sync with workspace admin allowlist.
import { ADMIN_EMAILS } from './roleUtils';

export function isInAudience(audience, userRole, user) {
  if (audience === 'all') return true;
  if (audience === 'beta') return ['scout', 'coach', 'admin'].includes(userRole);
  if (audience === 'admin') {
    return userRole === 'admin'
        || (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  }
  return false;
}
