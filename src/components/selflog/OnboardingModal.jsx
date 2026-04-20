import React, { useMemo, useState } from 'react';
import { Modal, Btn } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';

/**
 * Onboarding modal — shown when logged-in user has no player match.
 * User picks themselves from the roster; claim writes email to player.emails
 * so subsequent logins auto-match.
 *
 * Intentionally not dismissable via backdrop — user must claim or cancel
 * explicitly. Cancel keeps needsOnboarding=true so modal re-opens next load.
 */
export default function OnboardingModal({ open, players, onClaim, onCancel }) {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(null); // playerId while saving

  const filtered = useMemo(() => {
    if (!Array.isArray(players)) return [];
    const q = search.trim().toLowerCase();
    const sorted = [...players].sort((a, b) =>
      (a.nickname || a.name || '').localeCompare(b.nickname || b.name || '')
    );
    if (!q) return sorted;
    return sorted.filter(p => {
      const n = (p.nickname || '').toLowerCase();
      const name = (p.name || '').toLowerCase();
      const num = String(p.number || '');
      return n.includes(q) || name.includes(q) || num.includes(q);
    });
  }, [players, search]);

  const handleClaim = async (pid) => {
    setSaving(pid);
    try {
      await onClaim(pid);
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={t('onboarding_title') || 'Kim jesteś?'}
      footer={
        <Btn variant="ghost" onClick={onCancel} style={{ width: '100%' }}>
          {t('cancel')}
        </Btn>
      }
    >
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim,
        marginBottom: SPACE.md, lineHeight: 1.5,
      }}>
        {t('onboarding_subtitle') || 'Wybierz siebie z rosteru żeby zacząć logować swoje punkty'}
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('search') || 'Szukaj…'}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: `${SPACE.sm}px ${SPACE.md}px`,
          marginBottom: SPACE.sm,
          borderRadius: RADIUS.md,
          background: COLORS.bg,
          border: `1px solid ${COLORS.border}`,
          color: COLORS.text, fontFamily: FONT, fontSize: FONT_SIZE.base,
          outline: 'none',
        }}
      />

      <div style={{
        maxHeight: '50dvh', overflowY: 'auto',
        display: 'flex', flexDirection: 'column', gap: SPACE.xs,
      }}>
        {filtered.length === 0 && (
          <div style={{
            padding: SPACE.lg, textAlign: 'center',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            —
          </div>
        )}
        {filtered.map(p => (
          <button
            key={p.id}
            onClick={() => handleClaim(p.id)}
            disabled={!!saving}
            style={{
              display: 'flex', alignItems: 'center', gap: SPACE.md,
              padding: `${SPACE.sm}px ${SPACE.md}px`,
              minHeight: TOUCH.minTarget,
              background: COLORS.surfaceLight,
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.md,
              cursor: saving ? 'wait' : 'pointer',
              opacity: saving && saving !== p.id ? 0.4 : 1,
              textAlign: 'left',
              fontFamily: FONT,
            }}
          >
            <PlayerAvatar player={p} size={36} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
                color: COLORS.text,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {p.nickname || p.name || '—'}
              </div>
              {(p.number || p.name) && (
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
                  marginTop: 2,
                }}>
                  {p.number ? `#${p.number}` : ''}{p.number && p.nickname ? ' · ' : ''}{p.nickname ? p.name : ''}
                </div>
              )}
            </div>
            {saving === p.id && (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.accent,
              }}>…</div>
            )}
          </button>
        ))}
      </div>
    </Modal>
  );
}
