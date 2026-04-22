import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import { useAllFlags } from '../hooks/useFeatureFlag';
import { useWorkspace } from '../hooks/useWorkspace';
import { useLanguage } from '../hooks/useLanguage';
import { db } from '../services/firebase';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../utils/theme';

/**
 * Feature Flags (admin-only via AdminGuard in App.jsx).
 *
 * Workspace-global flag editor — admin toggles `enabled` on each flag
 * and cycles `audience` (all → beta → admin). Writes go to
 * `/workspaces/{slug}/config/featureFlags`; snapshot in useAllFlags
 * drives the re-render.
 *
 * Per-user flag overrides are intentionally NOT supported here — the
 * current architecture routes eligibility through audience rules
 * (featureFlags.js `isInAudience`), and per-user overrides would
 * require a separate brief (see DESIGN_DECISIONS § 46). This page
 * edits the audience-layer source of truth only.
 */

const AUDIENCE_ORDER = ['all', 'beta', 'admin'];
const AUDIENCE_COLORS = {
  all:   { bg: `${COLORS.success}18`, border: `${COLORS.success}40`, text: COLORS.success },
  beta:  { bg: `${COLORS.accent}18`,  border: `${COLORS.accent}40`,  text: COLORS.accent },
  admin: { bg: `${COLORS.danger}18`,  border: `${COLORS.danger}40`,  text: COLORS.danger },
};

export default function DebugFlagsPage() {
  const flags = useAllFlags();
  const { user, basePath } = useWorkspace();
  const { t } = useLanguage();

  return (
    <>
      <PageHeader back={{ to: '/' }} title={t('feature_flags_label') || 'Feature flags'} />
      <div style={{ padding: SPACE.lg, paddingBottom: 80 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          marginBottom: SPACE.md,
        }}>
          {user?.email} · {basePath}
        </div>

        {flags.map(f => (
          <FlagRow key={f.name} flag={f} basePath={basePath} />
        ))}

        <div style={{
          marginTop: SPACE.lg, padding: SPACE.md,
          background: COLORS.surfaceDark, borderRadius: RADIUS.md,
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          lineHeight: 1.5,
        }}>
          Changes write to <code style={{ color: COLORS.accent }}>{basePath || 'workspaces/…'}/config/featureFlags</code>.
          Audience determines eligibility: <b>all</b> = everyone, <b>beta</b> = scout/coach/admin, <b>admin</b> = admin only.
        </div>
      </div>
    </>
  );
}

function FlagRow({ flag, basePath }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const canWrite = !!basePath;

  async function write(update) {
    if (!canWrite || saving) return;
    setSaving(true);
    setError(null);
    try {
      await updateDoc(doc(db, basePath, 'config', 'featureFlags'), {
        [flag.name]: { enabled: flag.enabled, audience: flag.audience, ...update },
      });
    } catch (e) {
      console.error('[FeatureFlags] write failed:', e);
      setError(e.message || 'Write failed');
    } finally {
      setSaving(false);
    }
  }

  const toggleEnabled = () => write({ enabled: !flag.enabled });
  const cycleAudience = () => {
    const i = AUDIENCE_ORDER.indexOf(flag.audience);
    const next = AUDIENCE_ORDER[(i + 1) % AUDIENCE_ORDER.length];
    write({ audience: next });
  };

  const audColors = AUDIENCE_COLORS[flag.audience] || AUDIENCE_COLORS.all;

  return (
    <div style={{
      background: COLORS.surface,
      border: `1px solid ${flag.enabled ? `${COLORS.success}30` : COLORS.border}`,
      borderRadius: RADIUS.md,
      padding: SPACE.md,
      marginBottom: SPACE.xs,
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      opacity: saving ? 0.6 : 1,
      transition: 'opacity .15s, border-color .15s',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base,
          fontWeight: 600, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {flag.name}
        </div>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs,
          color: COLORS.textMuted, marginTop: 2,
        }}>
          {flag.visibleToMe ? 'active for you' : 'hidden for your role'}
          {error && <span style={{ color: COLORS.danger, marginLeft: 8 }}>· {error}</span>}
        </div>
      </div>

      {/* Audience pill — tap cycles all → beta → admin. Hit area 44+px
          per § 27 touch target min; visual pill stays chip-shaped. */}
      <button
        onClick={cycleAudience}
        disabled={!canWrite || saving}
        style={{
          padding: '10px 12px', borderRadius: 8,
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
          letterSpacing: 0.5, textTransform: 'uppercase',
          background: audColors.bg,
          border: `1px solid ${audColors.border}`,
          color: audColors.text,
          cursor: (canWrite && !saving) ? 'pointer' : 'default',
          minHeight: 44, minWidth: 56,
          WebkitTapHighlightColor: 'transparent',
        }}
      >{flag.audience}</button>

      {/* Enable toggle — 48×44 hit area (§ 27 touch target min) wraps a
          48×28 iOS-style track so the visual stays ergonomic. */}
      <button
        onClick={toggleEnabled}
        disabled={!canWrite || saving}
        aria-pressed={flag.enabled}
        style={{
          width: 48, height: 44,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 0, padding: 0,
          cursor: (canWrite && !saving) ? 'pointer' : 'default',
          flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{
          width: 48, height: 28, borderRadius: 14,
          background: flag.enabled ? COLORS.success : COLORS.surfaceLight,
          border: `1px solid ${flag.enabled ? COLORS.success : COLORS.border}`,
          position: 'relative', transition: 'background .15s, border-color .15s',
          pointerEvents: 'none',
        }}>
          <div style={{
            position: 'absolute',
            top: 2, left: flag.enabled ? 22 : 2,
            width: 22, height: 22, borderRadius: '50%',
            background: '#fff',
            transition: 'left .15s',
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }} />
        </div>
      </button>
    </div>
  );
}
