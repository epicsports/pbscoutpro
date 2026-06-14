/**
 * PbleaguesOnboardingPage — player-link gate (§ 38.12).
 *
 * Full-screen. No header, no tab nav. App.jsx routes every non-admin
 * user without a linkedPlayer + without `users/{uid}.linkSkippedAt`
 * here before letting them past the AppRoutes gate.
 *
 * 2026-04-24 relax-pbleagues-onboarding rewrite: the original screen had
 * a strict `NNNNN-NNNN` regex gate + a dead-end "no match" branch whose
 * only action was Wyloguj się. That blocked 100% of users who either
 * didn't know their full PBLI ID, typed it loosely, or weren't in the
 * roster yet. This rewrite mirrors the UX shipped in fa2f15c
 * (relax-player-linking) for ProfilePage by reusing `LinkProfileModal`:
 *   - any input accepted, 5-priority pbliMatching cascade
 *   - "Czy to ty?" confirmation card before the link write
 *   - "Pomiń na razie" skip fallback → writes linkSkippedAt so the
 *     gate falls through on subsequent renders, and user lands in the
 *     app with PPT in unlinked mode (pendingSelfReports, shipped in
 *     e94aafa).
 *
 * The link write uses `ds.selfLinkPlayer` for symmetry with ProfilePage's
 * self-claim flow (§ 49.8 Path A). pbliIdFull is not written — admin can
 * fill it in Členkowie if needed.
 */
import React, { useState, useRef, useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Btn } from '../components/ui';
import LinkProfileModal from '../components/settings/LinkProfileModal';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS } from '../utils/theme';
import { useWorkspace } from '../hooks/useWorkspace';
import { useLanguage } from '../hooks/useLanguage';
import { usePlayers } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { onPlayerLinked } from '../services/playerPerformanceTrackerService';

// § 84 B2-hotfix — watchdog timeout for in-flight selfLink. If the listener
// doesn't fire and the await doesn't settle within this window, recover the
// UI (clear busy + surface "Try again" message) so the user isn't stranded.
// The actual link contract (workspace-vs-global collection mismatch) is
// deferred to B2 (c); this hotfix only stops the funnel hang.
const WATCHDOG_MS = 8000;

export default function PbleaguesOnboardingPage() {
  const { t } = useLanguage();
  const { user, signOutUser } = useWorkspace();
  const { players } = usePlayers();
  // Self-claim picker shows the FULL global player catalog (Jacek 2026-06-14):
  // a user matching their profile must see the whole DB, not just their own
  // workspace's players. The §85 workspace-scoped filter was hiding everyone
  // when the user's workspace owned none of the candidate profiles (and emptied
  // entirely when useUserWorkspaces hadn't resolved). /players read is open
  // (auth != null), so this is rules-safe. matchPlayers() shows the unlinked
  // roster on empty query + searches all on a query.
  // NOTE: the §85 self-link WRITE carve-out still gates claims to
  // isMember(ownerWorkspaceId) — claiming a profile owned by another workspace
  // would be denied (own-workspace profiles claim fine). If cross-workspace
  // self-claim is needed, that's a separate §85 rules change (Jacek CONFIRM).
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  // § 84 B2-hotfix — single watchdog ref so re-entrant link attempts share it.
  const watchdogRef = useRef(null);
  const clearWatchdog = () => {
    if (watchdogRef.current) {
      clearTimeout(watchdogRef.current);
      watchdogRef.current = null;
    }
  };
  // Cleanup on unmount — page unmounts when AppRoutes flips post-link/post-skip.
  useEffect(() => () => clearWatchdog(), []);

  const handleSelect = async (player) => {
    if (!user?.uid || !player?.id || busy) return;
    setBusy(true);
    setError(null);
    // Start watchdog BEFORE the await — recovers the UI even if
    // selfLinkPlayer never settles (network hang, listener no-show).
    clearWatchdog();
    watchdogRef.current = setTimeout(() => {
      watchdogRef.current = null;
      setBusy(false);
      setError(t('onboarding_link_watchdog') || 'Połączenie trwa za długo. Spróbuj ponownie lub pomiń ten krok.');
    }, WATCHDOG_MS);
    try {
      await ds.selfLinkPlayer(player.id, user.uid);
      // Migrate any PPT logs the user wrote while unlinked over to the
      // canonical player path. Best-effort; the link itself has already
      // succeeded by this point, so migration failure is cosmetic.
      onPlayerLinked(user.uid, player.id).catch(err => {
        console.warn('PPT migrate-on-link failed (non-fatal):', err);
      });
      // App.jsx re-renders as soon as the subscribeLinkedPlayer listener
      // fires — this page unmounts naturally. No navigate needed. If the
      // listener doesn't fire (B2 root cause — collection mismatch deferred
      // to (c)), the watchdog above recovers the UI; busy also clears in
      // `finally` so user isn't stuck even before watchdog fires.
    } catch (e) {
      console.error('Self-link from onboarding failed:', e);
      setError(
        e?.message === 'ALREADY_LINKED'
          ? (t('onboarding_pbli_error_already_linked') || 'Ten profil gracza jest już podłączony do innego konta.')
          : (t('profile_claim_failed') || 'Nie udało się połączyć — spróbuj ponownie.')
      );
    } finally {
      // § 84 B2-hotfix — ALWAYS clear busy. Previously success-path relied on
      // listener fire (which unmounts the page); on the workspace-mismatch path
      // the listener never fires and busy stayed true → permanent hang.
      clearWatchdog();
      setBusy(false);
    }
  };

  const handleSkip = async () => {
    if (!user?.uid) return;
    // § 84 B2-hotfix — NO busy guard. Skip is an escape hatch; users must be
    // able to leave even mid-selfLink. Any in-flight selfLink may still settle
    // in the background (linkedPlayer will land if successful — gate logic
    // makes linkedPlayer beat linkSkippedAt naturally).
    clearWatchdog();
    setBusy(true);
    setError(null);
    try {
      await ds.skipLinkOnboarding(user.uid);
      // AppRoutes re-renders when userProfile snapshot lands with
      // linkSkippedAt set — the onboarding gate short-circuits and user
      // lands in the app.
    } catch (e) {
      console.error('Skip onboarding failed:', e);
      setError(t('onboarding_skip_failed') || 'Nie udało się pominąć. Spróbuj ponownie.');
    } finally {
      setBusy(false);
    }
  };

  // § 84 B2-hotfix — escape hatch: signOut + skip are always reachable, even
  // during busy. Bypass any callsite that gates on `busy`.
  const handleSignOut = () => {
    clearWatchdog();
    signOutUser();
  };

  const outer = {
    position: 'fixed', inset: 0,
    background: COLORS.bg,
    display: 'flex', flexDirection: 'column',
    zIndex: 50,
  };

  const topBar = {
    // § 84 B2-hotfix — z:110 above Modal backdrop (z:100) so Skip + Logout
    // stay reachable while the LinkProfileModal is mounted. Opaque
    // background covers backdrop pixels under the bar. `position: relative`
    // makes z-index apply.
    position: 'relative', zIndex: 110,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: `${SPACE.md}px ${SPACE.lg}px`,
    background: COLORS.bg,
    borderBottom: `1px solid ${COLORS.border}`,
    flexShrink: 0,
  };

  const content = {
    flex: 1,
    overflowY: 'auto',
    padding: SPACE.lg,
    display: 'flex', flexDirection: 'column',
    gap: SPACE.lg,
    maxWidth: 440, margin: '0 auto', width: '100%',
    boxSizing: 'border-box',
  };

  return (
    <div style={outer}>
      <div style={topBar}>
        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700,
          color: COLORS.text,
        }}>{t('onboarding_pbli_title') || 'Profil gracza'}</div>
        {/* § 84 B2-hotfix — persistent escape pair. Both ALWAYS-enabled
            (no `disabled={busy}`) so they stay reachable during in-flight
            selfLink. Bar's z:110 sits above the LinkProfileModal backdrop
            so taps land on the buttons, not the backdrop. */}
        <div style={{ display: 'flex', gap: SPACE.sm }}>
          <Btn variant="ghost" onClick={handleSkip}>
            {t('link_profile_nomatch_skip') || 'Pomiń na razie'}
          </Btn>
          <Btn variant="ghost" onClick={handleSignOut}>
            {t('pending_approval_signout') || 'Wyloguj się'}
          </Btn>
        </div>
      </div>

      <div style={content}>
        <div style={{
          padding: SPACE.lg,
          background: COLORS.surface,
          border: `1px solid ${COLORS.border}`,
          borderRadius: RADIUS.lg,
          display: 'flex', flexDirection: 'column', gap: SPACE.md,
        }}>
          <div style={{
            fontFamily: FONT, fontSize: 18, fontWeight: 700,
            color: COLORS.text, letterSpacing: '-0.2px',
          }}>
            {t('onboarding_pbli_soft_hero') || 'Podłącz profil gracza'}
          </div>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500,
            color: COLORS.textMuted, lineHeight: 1.5,
          }}>
            {t('onboarding_pbli_soft_body')
              || 'Podłącz swój profil z pbleagues.com aby mieć pełne statystyki i ranking. Możesz też pominąć ten krok — zrobisz to później w "Mój profil".'}
          </div>
          <a
            href="https://pbleagues.com"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              gap: 6,
              minHeight: 44,
              padding: `${SPACE.sm}px ${SPACE.md}px`,
              background: 'transparent',
              border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.md,
              color: COLORS.textDim,
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            <ExternalLink size={14} strokeWidth={2} />
            {t('onboarding_pbli_open_pbleagues') || 'Otwórz pbleagues.com'}
          </a>
          {error && (
            <div style={{
              padding: `${SPACE.xs}px ${SPACE.sm}px`,
              background: `${COLORS.danger}15`,
              border: `1px solid ${COLORS.danger}40`,
              borderRadius: RADIUS.sm,
              fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 600,
              color: COLORS.danger, lineHeight: 1.5,
            }}>{error}</div>
          )}
        </div>
      </div>

      {/* LinkProfileModal renders on top of the shell above. The shell's
          copy + pbleagues.com link stay visible via the modal's own
          backdrop transparency. onClose runs the "Pomiń na razie" flow
          — the modal's NoMatchFallback [Pomiń na razie] button also
          fires onClose so both skip paths converge here. onSelect
          triggers the self-link write. */}
      <LinkProfileModal
        open={true}
        onClose={handleSkip}
        players={players}
        currentLinkedPlayer={null}
        onSelect={handleSelect}
        busy={busy}
        error={error}
      />
    </div>
  );
}
