import React, { useEffect, useMemo, useState } from 'react';
import { Btn, Modal } from './ui';
import PlayerAvatar from './PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';
import { playerTeams } from '../utils/playerTeams';
import { useLanguage } from '../hooks/useLanguage';

// Shared by PlayersPage (workspace) + AdminPlayersPage (global).
// Mirrors TeamDuplicateResolutionView pattern:
//   - canonical-picker chip row at top
//   - per-field radios (which player's value wins)
//   - teams[] is always a union (no pick)
//   - name is locked to canonical's value
// Caller supplies `onConfirm(canonicalId, absorbedIds, mergedFields)` and
// owns the dataService call (the modal stays presentation-only so the same
// component works for both workspace + global semantics).

const MERGEABLE_FIELDS = [
  { key: 'nickname',       label: 'Nickname',     labelKey: 'merge_field_nickname' },
  { key: 'number',         label: 'Jersey #',     labelKey: 'merge_field_number' },
  { key: 'photoURL',       label: 'Photo URL',    labelKey: 'merge_field_photo_url' },
  { key: 'playerClass',    label: 'Class',        labelKey: 'merge_field_class' },
  { key: 'nationality',    label: 'Nationality',  labelKey: 'merge_field_nationality' },
  { key: 'pbliId',         label: 'PBLI ID',      labelKey: 'merge_field_pbli_id' },
  { key: 'favoriteBunker', label: 'Fav bunker',   labelKey: 'merge_field_fav_bunker' },
  { key: 'comment',        label: 'Notes',        labelKey: 'merge_field_notes' },
  { key: 'role',           label: 'Role',         labelKey: 'merge_field_role' },
];

const isEmpty = (v) => v == null || v === '' || (typeof v === 'string' && v.trim() === '');

// Score a player for the "recommended canonical" suggestion.
// Heavier weight on: HERO flag, presence of pbliId, photoURL, and number of
// non-empty scalar fields. Most recently updated breaks ties.
function scorePlayer(p) {
  let score = 0;
  if (p?.hero) score += 1000;
  if (p?.pbliId) score += 100;
  if (p?.photoURL) score += 50;
  MERGEABLE_FIELDS.forEach(f => { if (!isEmpty(p?.[f.key])) score += 10; });
  if (!isEmpty(p?.name)) score += 20;
  const ts = p?.updatedAt;
  if (ts) {
    try {
      const ms = typeof ts.toMillis === 'function' ? ts.toMillis() : new Date(ts).getTime();
      const daysSince = Math.max(0, (Date.now() - ms) / (1000 * 60 * 60 * 24));
      score += Math.max(0, 30 - daysSince / 7);
    } catch { /* noop */ }
  }
  return score;
}

export default function MergePlayersModal({ open, onClose, players, teams = [], onConfirm }) {
  const { t } = useLanguage();
  const list = useMemo(() => Array.isArray(players) ? players.filter(Boolean) : [], [players]);
  const scored = useMemo(
    () => [...list].map(p => ({ p, score: scorePlayer(p) })).sort((a, b) => b.score - a.score),
    [list],
  );
  const recommendedId = scored[0]?.p?.id || null;

  const [canonicalId, setCanonicalId] = useState(recommendedId);
  const [picks, setPicks] = useState({}); // { [fieldKey]: playerId }
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  // Reset on open / players change.
  useEffect(() => {
    if (!open) return;
    setCanonicalId(recommendedId);
    setError(null);
    setPending(false);
  }, [open, recommendedId]);

  // Re-seed picks whenever canonical changes: default each field to the
  // player who has the most "useful" non-empty value, preferring canonical.
  useEffect(() => {
    if (!open || !canonicalId) return;
    const next = {};
    MERGEABLE_FIELDS.forEach(f => {
      const canonicalPlayer = list.find(p => p.id === canonicalId);
      if (canonicalPlayer && !isEmpty(canonicalPlayer[f.key])) {
        next[f.key] = canonicalId;
        return;
      }
      const firstNonEmpty = list.find(p => !isEmpty(p[f.key]));
      next[f.key] = firstNonEmpty?.id || canonicalId;
    });
    setPicks(next);
  }, [open, canonicalId, list]);

  const canonical = list.find(p => p.id === canonicalId) || null;
  const absorbed = list.filter(p => p.id !== canonicalId);

  // Compute the union teams[] across all players for preview + merged write.
  const unionTeams = useMemo(() => {
    const seen = new Set();
    list.forEach(p => playerTeams(p).forEach(t => { if (t) seen.add(t); }));
    return [...seen];
  }, [list]);

  const getTeamName = (tid) => teams.find(t => t.id === tid)?.name || tid;

  // Build the merged-fields payload for confirm.
  // teams[] is a union (always). name is locked to canonical.
  // For other fields, only include when the picked value differs from
  // canonical's existing value AND is non-empty (avoid clobbering with '').
  const buildMergedFields = () => {
    if (!canonical) return {};
    const merged = {};
    MERGEABLE_FIELDS.forEach(f => {
      const winnerId = picks[f.key] || canonicalId;
      const winner = list.find(p => p.id === winnerId);
      const value = winner?.[f.key];
      if (isEmpty(value)) return;
      if (canonical[f.key] === value) return;
      merged[f.key] = value;
    });
    // teams[] union — only write when it actually grows the canonical's set.
    const canonicalTeamSet = new Set(playerTeams(canonical));
    if (unionTeams.some(t => !canonicalTeamSet.has(t))) {
      merged.teams = unionTeams;
    }
    return merged;
  };

  const handleConfirm = async () => {
    if (!canonical || absorbed.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      await onConfirm?.(canonical.id, absorbed.map(p => p.id), buildMergedFields());
      onClose?.();
    } catch (e) {
      console.error('Merge failed:', e);
      setError(e?.message || 'Merge failed — see console');
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;
  if (list.length < 2) return null;

  return (
    <Modal
      open={open}
      onClose={pending ? () => {} : onClose}
      title={t('merge_title', list.length)}
      footer={<>
        <Btn variant="default" onClick={onClose} disabled={pending}>{t('cancel')}</Btn>
        <Btn variant="accent" onClick={handleConfirm}
          disabled={!canonical || pending || absorbed.length === 0}>
          {pending
            ? t('merge_merging')
            : t('merge_confirm_into', canonical?.nickname || canonical?.name || '—')}
        </Btn>
      </>}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md, maxHeight: '70dvh', overflowY: 'auto' }}>
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>
          {t('merge_description', absorbed.length)}
        </div>

        {/* Canonical picker cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(list.length, 3)}, 1fr)`,
          gap: SPACE.sm,
        }}>
          {scored.map(({ p }) => {
            const isPicked = p.id === canonicalId;
            const isRecommended = p.id === recommendedId;
            return (
              <button
                key={p.id}
                onClick={() => setCanonicalId(p.id)}
                disabled={pending}
                style={{
                  display: 'flex', flexDirection: 'column', gap: SPACE.xs,
                  padding: SPACE.sm, borderRadius: RADIUS.md,
                  background: isPicked ? `${COLORS.accent}10` : COLORS.surfaceDark,
                  border: `2px solid ${isPicked ? COLORS.accent : COLORS.border}`,
                  cursor: pending ? 'not-allowed' : 'pointer',
                  textAlign: 'left',
                  fontFamily: FONT, color: COLORS.text,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs }}>
                  <PlayerAvatar player={p} size={32} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.nickname || p.name || '—'}
                    </div>
                    {p.nickname && p.name && p.nickname !== p.name && (
                      <div style={{ fontSize: 10, color: COLORS.textMuted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </div>
                    )}
                  </div>
                  {isRecommended && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                      background: `${COLORS.success}20`, color: COLORS.success,
                      letterSpacing: 0.5, textTransform: 'uppercase',
                    }}>rec</span>
                  )}
                </div>
                <div style={{ fontSize: 10, color: COLORS.textMuted, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {p.hero && <span style={{ color: COLORS.accent, fontWeight: 700 }}>HERO</span>}
                  {p.pbliId && <span>PBLI {p.pbliId}</span>}
                  {p.photoURL && <span style={{ color: COLORS.success }}>📷</span>}
                </div>
              </button>
            );
          })}
        </div>

        {/* Name (locked to canonical) */}
        {canonical && (
          <FieldHeader label={t('merge_name_locked')} />
        )}
        {canonical && (
          <div style={{
            padding: '8px 10px', borderRadius: RADIUS.sm,
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
            fontFamily: FONT, fontSize: 13, color: COLORS.text,
          }}>
            {canonical.name || '—'}
          </div>
        )}

        {/* Per-field rows — hide rows where all players agree (no decision needed) */}
        {MERGEABLE_FIELDS.map(f => {
          const values = list.map(p => ({ pid: p.id, value: p[f.key] }));
          const distinct = new Set(values.map(v => (isEmpty(v.value) ? '' : String(v.value))));
          if (distinct.size <= 1) return null;
          return (
            <div key={f.key}>
              <FieldHeader label={t(f.labelKey)} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {values.map(v => {
                  const isPicked = picks[f.key] === v.pid;
                  const player = list.find(p => p.id === v.pid);
                  const display = isEmpty(v.value) ? '(empty)' : String(v.value);
                  return (
                    <label
                      key={v.pid}
                      style={{
                        display: 'flex', alignItems: 'center', gap: SPACE.sm,
                        padding: '6px 10px', borderRadius: RADIUS.sm,
                        background: isPicked ? `${COLORS.accent}10` : COLORS.surfaceDark,
                        border: `1px solid ${isPicked ? `${COLORS.accent}40` : COLORS.border}`,
                        cursor: pending || isEmpty(v.value) ? 'not-allowed' : 'pointer',
                        opacity: isEmpty(v.value) ? 0.5 : 1,
                        minHeight: 36,
                      }}
                    >
                      <input
                        type="radio"
                        checked={isPicked}
                        onChange={() => !isEmpty(v.value) && setPicks(prev => ({ ...prev, [f.key]: v.pid }))}
                        disabled={pending || isEmpty(v.value)}
                        style={{ accentColor: COLORS.accent }}
                      />
                      <span style={{
                        fontFamily: FONT, fontSize: 11, color: COLORS.textMuted, minWidth: 80,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {player?.nickname || player?.name || '—'}
                      </span>
                      <span style={{
                        flex: 1, fontFamily: FONT, fontSize: 13, fontWeight: 600,
                        color: isEmpty(v.value) ? COLORS.textMuted : COLORS.text,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {display}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Teams union — display only */}
        {unionTeams.length > 0 && (
          <div>
            <FieldHeader label={t('merge_teams_union', unionTeams.length)} />
            <div style={{
              padding: '8px 10px', borderRadius: RADIUS.sm,
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              fontFamily: FONT, fontSize: 12, color: COLORS.textDim, lineHeight: 1.6,
            }}>
              {unionTeams.map(t => getTeamName(t)).join(' · ')}
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: SPACE.sm, borderRadius: RADIUS.sm,
            background: `${COLORS.danger}18`,
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger,
          }}>
            {error}
          </div>
        )}
      </div>
    </Modal>
  );
}

function FieldHeader({ label }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700, color: COLORS.textMuted,
      textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4, marginTop: 4,
    }}>
      {label}
    </div>
  );
}
