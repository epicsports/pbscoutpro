import React from 'react';
import PageHeader from '../components/PageHeader';
import { useAllFlags } from '../hooks/useFeatureFlag';
import { useWorkspace } from '../hooks/useWorkspace';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../utils/theme';

export default function DebugFlagsPage() {
  const flags = useAllFlags();
  const { user } = useWorkspace();

  return (
    <>
      <PageHeader back={{ to: '/' }} title="Debug: Feature Flags" />
      <div style={{ padding: SPACE.lg }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          marginBottom: SPACE.md,
        }}>
          User: {user?.email} (uid: {user?.uid?.slice(0, 8)})
        </div>

        {flags.map(f => (
          <div key={f.name} style={{
            background: COLORS.surface,
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            padding: SPACE.md,
            marginBottom: SPACE.xs,
            display: 'flex', alignItems: 'center', gap: SPACE.md,
          }}>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.base,
                fontWeight: 600, color: COLORS.text,
              }}>
                {f.name}
              </div>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs,
                color: COLORS.textMuted, marginTop: 2,
              }}>
                audience: {f.audience} · enabled: {f.enabled ? 'YES' : 'NO'}
              </div>
            </div>
            <div style={{
              padding: '4px 10px', borderRadius: RADIUS.xs, fontSize: FONT_SIZE.xs, fontWeight: 700,
              fontFamily: FONT,
              background: f.visibleToMe ? `${COLORS.success}20` : `${COLORS.danger}20`,
              color: f.visibleToMe ? COLORS.success : COLORS.danger,
            }}>
              {f.visibleToMe ? 'ACTIVE FOR ME' : 'HIDDEN'}
            </div>
          </div>
        ))}

        <div style={{
          marginTop: SPACE.lg, padding: SPACE.md,
          background: COLORS.surfaceDark, borderRadius: RADIUS.md,
          fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
          lineHeight: 1.5,
        }}>
          To toggle a flag, edit Firestore document:<br/>
          <code style={{ color: COLORS.accent }}>/workspaces/[slug]/config/featureFlags</code>
        </div>
      </div>
    </>
  );
}
