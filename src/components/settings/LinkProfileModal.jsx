import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Btn, Input } from '../ui';
import PlayerAvatar from '../PlayerAvatar';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { useUserProfiles } from '../../hooks/useUserNames';
import { useTeams } from '../../hooks/useFirestore';
import { matchPlayers } from '../../utils/pbliMatching';

/**
 * LinkProfileModal — picks a player profile to link to a user (admin via
 * Členkowie panel, self via ProfilePage). § 49.8 Path A + § 50.4 + the
 * 2026-04-24 relax-player-linking hotfix.
 *
 * Three render states (single modal, swap content based on internal state):
 *
 *   list      → search input + matchPlayers() cascade hits + skip-fallback
 *               when query is non-empty and zero candidates returned
 *   confirm   → "Czy to ty?" card with avatar + identity + [Tak][Nie]
 *               (always required before write — prevents wrong-profile clicks)
 *   no result → "Nie znaleźliśmy Cię" message + [Pomiń na razie] CTA
 *
 * Cascade priorities live in `src/utils/pbliMatching.js`. This component
 * is presentation-only: caller wires `onSelect(player)` to the actual
 * Firestore write (ds.selfLinkPlayer / ds.adminLinkPlayer / etc).
 */
export default function LinkProfileModal({
  open, onClose, players, currentLinkedPlayer, onSelect, busy,
}) {
  const { t } = useLanguage();
  const { teams } = useTeams();
  const [query, setQuery] = useState('');
  const [confirmTarget, setConfirmTarget] = useState(null);

  // Reset internal state every time the modal opens. Without this, a closed
  // modal that previously had a confirm-target open would re-open mid-flow
  // and surprise the caller.
  useEffect(() => {
    if (!open) {
      setQuery('');
      setConfirmTarget(null);
    }
  }, [open]);

  // Resolve emails for players whose linkedUid != null AND != currentUid
  // (visible "already linked" subtext).
  const conflictUids = useMemo(() => {
    const s = new Set();
    (players || []).forEach(p => {
      if (p.linkedUid && p.linkedUid !== currentLinkedPlayer?.linkedUid) s.add(p.linkedUid);
    });
    return [...s];
  }, [players, currentLinkedPlayer]);
  const profiles = useUserProfiles(conflictUids);

  // 4-priority PBLI cascade for PBLI-ish queries; substring fallback on
  // nickname/name for alpha queries; full unlinked roster on empty query.
  // See src/utils/pbliMatching.js for cascade rules.
  const matched = useMemo(
    () => matchPlayers(query, players),
    [query, players],
  );

  // Skip-fallback only fires for non-empty PBLI-ish queries that returned
  // zero hits. Empty query just shows the alphabetical roster — no need
  // for fallback UI there.
  const showSkipFallback = !!query.trim() && matched.length === 0;

  const handleRowTap = (player) => {
    if (busy) return;
    setConfirmTarget(player);
  };

  const handleConfirm = () => {
    if (!confirmTarget) return;
    onSelect(confirmTarget);
    // Caller closes the modal on success — leaving confirmTarget set so
    // the spinner / disabled state remains visible during the write.
  };

  const teamNameFor = (teamId) => {
    if (!teamId) return '';
    return (teams || []).find(tm => tm.id === teamId)?.name || '';
  };

  return (
    <Modal open={open} onClose={busy ? undefined : onClose}
      title={confirmTarget
        ? (t('link_profile_confirm_title') || 'Znaleźliśmy Cię!')
        : (t('link_profile_title') || 'Wybierz profil gracza')}>
      {confirmTarget ? (
        <ConfirmCard
          player={confirmTarget}
          teamName={teamNameFor(confirmTarget.teamId)}
          onConfirm={handleConfirm}
          onBack={busy ? undefined : () => setConfirmTarget(null)}
          busy={busy}
          t={t}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <Input
            value={query}
            onChange={setQuery}
            placeholder={t('link_profile_search_ph') || 'Szukaj po pseudonimie lub PBLI…'}
          />

          {showSkipFallback ? (
            <NoMatchFallback
              onSkip={onClose}
              onRetry={() => setQuery('')}
              busy={busy}
              t={t}
            />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: SPACE.xs,
              maxHeight: '60dvh', overflowY: 'auto',
              margin: `0 -${SPACE.xs}px`, padding: `0 ${SPACE.xs}px`,
            }}>
              {matched.length === 0 ? (
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
                  textAlign: 'center', padding: SPACE.lg,
                }}>{t('no_matches') || 'Brak wyników'}</div>
              ) : matched.map(p => {
                const isCurrent = p.id === currentLinkedPlayer?.id;
                const conflictEmail = p.linkedUid && p.linkedUid !== currentLinkedPlayer?.linkedUid
                  ? (profiles[p.linkedUid]?.email || profiles[p.linkedUid]?.displayName || null)
                  : null;
                return (
                  <PlayerOption
                    key={p.id}
                    player={p}
                    current={isCurrent}
                    conflictLabel={conflictEmail}
                    disabled={busy}
                    onSelect={() => handleRowTap(p)}
                    t={t}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

/**
 * ConfirmCard — "Czy to ty?" gate shown after the user picks a candidate
 * but BEFORE the link write fires. Prevents accidental wrong-profile links
 * when names collide or substring matches return adjacent players.
 */
function ConfirmCard({ player, teamName, onConfirm, onBack, busy, t }) {
  const name = player.nickname || player.name || 'Player';
  const number = player.number ? `#${player.number}` : '';
  const pbli = player.pbliIdFull || player.pbliId
    ? `PBLI: ${String(player.pbliIdFull || player.pbliId).replace(/^#?/, '')}`
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACE.sm,
        padding: `${SPACE.lg}px ${SPACE.md}px`,
        background: COLORS.surfaceDark,
        border: `1px solid ${COLORS.border}`,
        borderRadius: RADIUS.lg,
      }}>
        <PlayerAvatar player={player} size={64} />
        <div style={{
          fontFamily: FONT, fontSize: 18, fontWeight: 700,
          color: COLORS.text, textAlign: 'center', letterSpacing: '-0.2px',
        }}>{name} {number}</div>
        {teamName && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
            color: COLORS.textMuted, textAlign: 'center',
          }}>{teamName}</div>
        )}
        {pbli && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 500,
            color: COLORS.textDim, textAlign: 'center',
          }}>{pbli}</div>
        )}
      </div>

      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, textAlign: 'center',
      }}>
        {t('link_profile_confirm_question') || 'Czy to Ty?'}
      </div>

      <div style={{ display: 'flex', gap: SPACE.sm }}>
        <Btn variant="default" onClick={onBack} disabled={busy} style={{ flex: 1 }}>
          {t('link_profile_confirm_no') || 'Nie, szukaj dalej'}
        </Btn>
        <Btn variant="accent" onClick={onConfirm} disabled={busy} style={{ flex: 1 }}>
          {busy
            ? (t('saving') || '…')
            : (t('link_profile_confirm_yes') || 'Tak, to ja')}
        </Btn>
      </div>
    </div>
  );
}

/**
 * NoMatchFallback — empty-result UI for non-empty queries. Surfaces the
 * skip-link affordance so users blocked by data quirks (PBLI ID not in DB,
 * old form, etc.) can proceed unlinked and ask for help later.
 */
function NoMatchFallback({ onSkip, onRetry, busy, t }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', gap: SPACE.md,
      padding: SPACE.lg,
      background: COLORS.surfaceDark,
      border: `1px solid ${COLORS.border}`,
      borderRadius: RADIUS.lg,
      textAlign: 'center',
    }}>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700,
        color: COLORS.text,
      }}>
        {t('link_profile_nomatch_title') || 'Nie znaleźliśmy Cię w bazie'}
      </div>
      <div style={{
        fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
        color: COLORS.textMuted, lineHeight: 1.5,
      }}>
        {t('link_profile_nomatch_body') || 'Sprawdź swój PBLI ID lub poproś admina o ręczne połączenie. Możesz też pominąć ten krok — wrócisz do tego później.'}
      </div>
      <div style={{ display: 'flex', gap: SPACE.sm, marginTop: SPACE.xs }}>
        <Btn variant="default" onClick={onRetry} disabled={busy} style={{ flex: 1 }}>
          {t('link_profile_nomatch_retry') || 'Spróbuj ponownie'}
        </Btn>
        <Btn variant="ghost" onClick={onSkip} disabled={busy} style={{ flex: 1 }}>
          {t('link_profile_nomatch_skip') || 'Pomiń na razie'}
        </Btn>
      </div>
    </div>
  );
}

function PlayerOption({ player, current, conflictLabel, disabled, onSelect, t }) {
  const name = player.nickname || player.name || 'Player';
  const number = player.number ? `#${player.number}` : '';
  const pbli = player.pbliId ? `PBLI #${String(player.pbliId).replace(/^#?/, '')}` : '';
  const subBits = [pbli, conflictLabel ? `${t('link_profile_already_taken') || 'Already linked'}: ${conflictLabel}` : null]
    .filter(Boolean).join(' · ');
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: SPACE.md,
      padding: `${SPACE.sm}px ${SPACE.md}px`, minHeight: 56,
      background: current ? `${COLORS.accent}12` : COLORS.surfaceDark,
      border: `1px solid ${current ? `${COLORS.accent}55` : COLORS.border}`,
      borderRadius: RADIUS.md,
    }}>
      <PlayerAvatar player={player} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600,
          color: current ? COLORS.accent : COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{name} {number}</div>
        {subBits && (
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted,
            marginTop: 2,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subBits}</div>
        )}
      </div>
      <Btn
        variant={current ? 'default' : 'accent'}
        onClick={onSelect}
        disabled={disabled || current}
      >{current ? '✓' : (t('link_profile_select') || 'Wybierz')}</Btn>
    </div>
  );
}
