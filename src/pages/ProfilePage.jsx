import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import { Btn, ConfirmModal, Input, Modal, Select } from '../components/ui';
import RoleChips from '../components/settings/RoleChips';
import LinkProfileModal from '../components/settings/LinkProfileModal';
import { NATIONALITIES } from '../components/PlayerEditModal';
import { auth, db } from '../services/firebase';
import * as ds from '../services/dataService';
import { onPlayerLinked } from '../services/playerPerformanceTrackerService';
import { invalidateUserName } from '../hooks/useUserNames';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import { usePlayers, useActiveTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, ELEV, TRACKING, TNUM } from '../utils/theme';
import { ASSIGNABLE_ROLES } from '../utils/roleUtils';
import { useDevice } from '../hooks/useDevice';
import RdIcon from '../components/RdIcon';

/**
 * ProfilePage — account settings for the logged-in Firebase user.
 *
 * Sections:
 * - Identity: avatar + email (read-only). Avatar URL editor removed —
 *   users own multiple player profiles with their own photos (managed
 *   via admin PlayerEditModal); a single user-doc avatar was creating
 *   confusion.
 * - Display name (Firebase Auth updateProfile + mirror to /users/{uid})
 * - Password (reauth + updatePassword)
 * - Roles (§ 33.3, NEW): read-only chips showing current workspace roles
 * - Player data (§ 33.3, NEW): conditional on linkedPlayer — lets the
 *   linked player edit their own roster-facing identity fields.
 *   Firestore rule carve-out at /workspaces/{slug}/players/{pid} allows
 *   self-edit when resource.data.linkedUid == auth.uid AND the update
 *   touches only the whitelist: nickname / name / number / age /
 *   favoriteBunker / nationality / updatedAt.
 */

const PLAYER_FIELD_DEFAULTS = {
  name: '', nickname: '', number: '', age: '',
  favoriteBunker: '', nationality: '',
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = auth.currentUser;
  const { linkedPlayer, roles, workspace } = useWorkspace();
  const { teams } = useActiveTeams();
  const { players } = usePlayers();
  // Self-claim picker shows the FULL global player catalog (Jacek 2026-06-14):
  // matching your own profile must see the whole DB, not just your workspace's
  // players (the §85 workspace filter emptied the list when the user's ws owned
  // no candidates / before useUserWorkspaces resolved). /players read is open, so
  // rules-safe. The §85 self-link WRITE still gates claims to
  // isMember(ownerWorkspaceId) — cross-workspace claim = separate rules CONFIRM.

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [nameStatus, setNameStatus] = useState(null); // 'saved' | 'error'

  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState(null);
  const [pwSuccess, setPwSuccess] = useState(false);

  // Player edit state — populated from linkedPlayer when it arrives via
  // onSnapshot (useWorkspace.linkedPlayer subscription). Dirty tracking
  // via shallow compare against the live doc so the save button disables
  // when nothing has changed.
  const [player, setPlayer] = useState(PLAYER_FIELD_DEFAULTS);
  const [playerSaving, setPlayerSaving] = useState(false);
  const [playerStatus, setPlayerStatus] = useState(null); // 'saved' | 'error'

  // Self-claim flow (§ 49.8 Path A) — link / unlink the user's own uid to a
  // player doc when not already linked. Modal search mirrors admin
  // LinkProfileModal; self-link rule at /players/{pid} allows writes only
  // when resource.data.linkedUid == null.
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinking, setUnlinking] = useState(false);
  const [linkToast, setLinkToast] = useState(null); // 'linked' | 'unlinked'

  useEffect(() => {
    if (!linkedPlayer) {
      setPlayer(PLAYER_FIELD_DEFAULTS);
      return;
    }
    setPlayer({
      name: linkedPlayer.name || '',
      nickname: linkedPlayer.nickname || '',
      number: linkedPlayer.number || '',
      age: linkedPlayer.age != null ? String(linkedPlayer.age) : '',
      favoriteBunker: linkedPlayer.favoriteBunker || '',
      nationality: linkedPlayer.nationality || '',
    });
  }, [linkedPlayer]);

  // Premium redesign — responsive: wide (≥720) centers the column (owns its width,
  // not a 460 sheet). Hook above the early return so it runs unconditionally.
  const device = useDevice();
  const wide = device.width >= 720;

  if (!user) {
    return (
      <Screen archetype="detail" padBottom={false} style={{ minHeight: '100dvh', background: COLORS.bg }}
        header={<PageHeader back={{ to: '/' }} title={t('my_profile') || 'Mój profil'} />}>
        <div style={{ padding: SPACE.lg, textAlign: 'center', color: COLORS.textMuted }}>
          {t('not_signed_in') || 'Nie jesteś zalogowany.'}
        </div>
      </Screen>
    );
  }

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed === user.displayName) return;
    setSavingName(true); setNameStatus(null);
    try {
      await updateProfile(user, { displayName: trimmed });
      // Mirror to Firestore /users/{uid} so other places (Scout Ranking,
      // collaborators list, etc.) see the new name immediately.
      await setDoc(doc(db, 'users', user.uid),
        { displayName: trimmed, email: user.email || '' },
        { merge: true });
      invalidateUserName(user.uid);
      setNameStatus('saved');
      setTimeout(() => setNameStatus(null), 2500);
    } catch (e) {
      console.error(e);
      setNameStatus('error');
    }
    setSavingName(false);
  };

  const openPwModal = () => {
    setCurrentPw(''); setNewPw(''); setNewPwConfirm('');
    setPwError(null); setPwSuccess(false);
    setPwModalOpen(true);
  };

  const handleChangePw = async () => {
    setPwError(null);
    if (newPw.length < 6) {
      setPwError(t('pw_too_short') || 'Hasło musi mieć minimum 6 znaków.');
      return;
    }
    if (newPw !== newPwConfirm) {
      setPwError(t('pw_mismatch') || 'Hasła się nie zgadzają.');
      return;
    }
    setPwSaving(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPw);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPw);
      setPwSuccess(true);
      setTimeout(() => { setPwModalOpen(false); setPwSuccess(false); }, 1500);
    } catch (e) {
      console.error(e);
      if (e.code === 'auth/wrong-password' || e.code === 'auth/invalid-credential') {
        setPwError(t('pw_wrong_current') || 'Obecne hasło jest nieprawidłowe.');
      } else if (e.code === 'auth/weak-password') {
        setPwError(t('pw_too_short') || 'Hasło jest zbyt słabe.');
      } else {
        setPwError(e.message || 'Error');
      }
    }
    setPwSaving(false);
  };

  // Shallow-compare current form state against the live linkedPlayer doc so
  // the save CTA disables when nothing has changed. Handles age type coercion
  // (string input ↔ numeric field).
  const playerDirty = linkedPlayer && (
    player.name !== (linkedPlayer.name || '')
    || player.nickname !== (linkedPlayer.nickname || '')
    || player.number !== (linkedPlayer.number || '')
    || player.age !== (linkedPlayer.age != null ? String(linkedPlayer.age) : '')
    || player.favoriteBunker !== (linkedPlayer.favoriteBunker || '')
    || player.nationality !== (linkedPlayer.nationality || '')
  );
  const playerValid = player.name.trim() && player.number.trim();

  const handleSavePlayer = async () => {
    if (!linkedPlayer || !playerDirty || !playerValid) return;
    setPlayerSaving(true); setPlayerStatus(null);
    try {
      // Whitelist matches the Firestore self-edit rule carve-out exactly.
      // Any field outside this set would be rejected by rules.
      await ds.updatePlayer(linkedPlayer.id, {
        name: player.name.trim(),
        nickname: player.nickname.trim(),
        number: player.number.trim(),
        age: player.age ? Number(player.age) : null,
        favoriteBunker: player.favoriteBunker || null,
        nationality: player.nationality || null,
      });
      setPlayerStatus('saved');
      setTimeout(() => setPlayerStatus(null), 2500);
    } catch (e) {
      console.error('Save player failed:', e);
      setPlayerStatus('error');
    }
    setPlayerSaving(false);
  };

  const linkedTeamName = linkedPlayer?.teamId
    ? (teams || []).find(tm => tm.id === linkedPlayer.teamId)?.name
    : null;

  useEffect(() => {
    if (!linkToast) return;
    const id = setTimeout(() => setLinkToast(null), 1800);
    return () => clearTimeout(id);
  }, [linkToast]);

  const handleClaim = async (target) => {
    if (!user || claimBusy || !target) return;
    setClaimBusy(true); setClaimError(null);
    try {
      await ds.selfLinkPlayer(target.id, user.uid);
      setClaimOpen(false);
      setLinkToast('linked');
      // Move any PPT logs the user wrote while unlinked over to the
      // canonical player path. Best-effort; failure here doesn't roll
      // back the link itself (link is the user-visible win).
      onPlayerLinked(user.uid, target.id).catch(err => {
        console.warn('PPT migrate-on-link failed (non-fatal):', err);
      });
    } catch (e) {
      console.error('Self-link player failed:', e);
      setClaimError(t('profile_claim_failed') || 'Nie udało się połączyć — spróbuj ponownie.');
    } finally {
      setClaimBusy(false);
    }
  };

  const handleUnlink = async () => {
    if (!linkedPlayer || unlinking) return;
    setUnlinking(true);
    try {
      await ds.selfUnlinkPlayer(linkedPlayer.id);
      setUnlinkOpen(false);
      setLinkToast('unlinked');
    } catch (e) {
      console.error('Self-unlink player failed:', e);
      alert(`${t('profile_unlink_failed') || 'Nie udało się rozłączyć'}: ${e.message || e}`);
    } finally {
      setUnlinking(false);
    }
  };

  // ── Wide (≥720) — DASHBOARD layout (hero identity ↔ secondary account) ──
  // Ports prototype `MyProfileWide` (redesign6.jsx:134). Phone path below is
  // untouched (additive). Wired to the SAME real state/handlers — only the
  // shell differs. Two-col grid collapses to single column under 820 (the
  // hero stays full-width on the narrower wide range, matching the prototype's
  // internal `useWide(820)` breakpoint).
  const twoCol = device.width >= 820;
  const tc = COLORS.accent;
  const roleIcon = { admin: 'building', coach: 'book', scout: 'target', player: 'jersey' };
  const number = (linkedPlayer?.number || '').toString().trim();
  const nick = (linkedPlayer?.nickname || '').trim();
  const age = linkedPlayer?.age != null && linkedPlayer.age !== '' ? linkedPlayer.age : null;
  const fullName = (user.displayName || '').trim();
  const emailLocal = (user.email || '').split('@')[0] || '';
  // Name split for the hero stack — last line is the emphasised one. Falls back
  // to the email when no display name is set (edge: no name → single line).
  const heroName = fullName || user.email || '';
  const nameParts = fullName ? fullName.split(' ') : [];
  const firstName = nameParts.length > 1 ? nameParts[0] : '';
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : heroName;

  const wcard = { background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, borderRadius: 18, boxShadow: ELEV.shadow1 };

  // Section wrapper as a plain function (NOT a component) — invoked inline so the
  // inputs inside don't remount on every keystroke (React would treat a render-scoped
  // component as a fresh type each render → focus loss in the player-data fields).
  const wSection = (title, source, children) => (
    <div style={{ ...wcard, padding: 20, marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text }}>{title}</span>
        {source && <span style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: COLORS.textDim, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, borderRadius: 999, padding: '3px 10px', letterSpacing: '.3px' }}>{source}</span>}
      </div>
      {children}
    </div>
  );

  const wideBody = (
    <div style={{ flex: 1, maxWidth: 1080, width: '100%', margin: '0 auto', padding: twoCol ? '28px 28px 80px' : '20px 16px 80px', boxSizing: 'border-box', display: 'grid', gridTemplateColumns: twoCol ? 'minmax(0, 380px) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: twoCol ? 24 : 16, alignItems: 'start' }}>
      {/* LEFT — HERO identity card (sticky on wide) */}
      <div style={{ position: twoCol ? 'sticky' : 'static', top: 16, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ ...wcard, padding: 0, overflow: 'hidden' }}>
          {/* hero band */}
          <div style={{ position: 'relative', overflow: 'hidden', padding: '26px 22px 22px', background: `radial-gradient(125% 130% at 84% 6%, ${tc}4d, ${tc}10 46%, transparent 70%), linear-gradient(165deg, ${ELEV.raised}, ${ELEV.surface})` }}>
            {/* number watermark — only when the linked player has a number */}
            {number && (
              <div style={{ position: 'absolute', top: -30, right: -8, fontFamily: FONT, fontSize: 158, fontWeight: 900, lineHeight: 1, color: '#fff', opacity: 0.05, letterSpacing: '-6px', pointerEvents: 'none', ...TNUM }}>{number}</div>
            )}
            <div style={{ position: 'absolute', top: 0, bottom: 0, right: '20%', width: 4, transform: 'skewX(-16deg)', background: tc, opacity: 0.5, pointerEvents: 'none' }} />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <div style={{ width: 104, height: 104, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 50% 38%, ${tc}40, ${ELEV.sunken})`, border: `2.5px solid ${tc}88`, boxShadow: `0 6px 22px ${tc}33, ${ELEV.innerTop}`, overflow: 'hidden', fontFamily: FONT, fontSize: 38, fontWeight: 800, color: COLORS.text }}>
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="avatar"
                      onError={(e) => { e.target.style.display = 'none'; }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    (user.displayName || user.email || '?').charAt(0).toUpperCase()
                  )}
                </div>
                {/* number badge — only when a number exists */}
                {number && (
                  <span style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', background: tc, color: '#1a1206', fontFamily: FONT, fontSize: 13, fontWeight: 800, borderRadius: 999, padding: '3px 13px', border: `2px solid ${ELEV.surface}`, ...TNUM }}>#{number.replace(/^#/, '')}</span>
                )}
              </div>
              {/* nick eyebrow — gone when no nickname */}
              {nick && (
                <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 900, color: tc, letterSpacing: '1.4px', textTransform: 'uppercase' }}>„{nick}”</div>
              )}
              {firstName && (
                <div style={{ fontFamily: FONT, fontSize: 18, fontWeight: 500, color: COLORS.text, lineHeight: 1.05, marginTop: 4 }}>{firstName}</div>
              )}
              <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 900, color: COLORS.text, lineHeight: 1.05, letterSpacing: '-.5px', textTransform: 'uppercase', wordBreak: 'break-word' }}>{lastName}</div>
              <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textMuted, marginTop: 9, overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
                {emailLocal && <>@{emailLocal}</>}{age != null && <>{emailLocal ? ' · ' : ''}{age} {t('profile_years') || 'lat'}</>}
              </div>
            </div>
          </div>
          {/* roles = permission tiles — all four, granted vs not */}
          <div style={{ padding: '16px 18px', borderTop: `1px solid ${ELEV.hairline}` }}>
            <div style={{ fontFamily: FONT, fontSize: 10.5, fontWeight: 800, color: COLORS.textMuted, letterSpacing: TRACKING.label, marginBottom: 11 }}>{(t('profile_roles_label') || 'Twoje role').toUpperCase()}</div>
            {!workspace ? (
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, fontStyle: 'italic' }}>
                {t('profile_roles_no_workspace') || 'Wybierz workspace aby zobaczyć swoje role.'}
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                {ASSIGNABLE_ROLES.map(r => {
                  const on = roles.includes(r);
                  return (
                    <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 12px', borderRadius: 11, minHeight: 44, boxSizing: 'border-box', background: on ? COLORS.accentA12 : ELEV.sunken, border: `1px solid ${on ? COLORS.accentA40 : ELEV.hairline}` }}>
                      <span style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: on ? COLORS.accent : ELEV.surface, color: on ? '#1a1206' : COLORS.textMuted, border: on ? 'none' : `1px solid ${ELEV.hairline}` }}><RdIcon name={roleIcon[r] || 'jersey'} size={14} /></span>
                      <span style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 800, color: on ? COLORS.accent : COLORS.textMuted }}>{t(`role_${r}`) || r}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT — account settings (secondary) */}
      <div style={{ minWidth: 0 }}>
        {/* Display name */}
        {wSection(t('display_name') || 'Nazwa użytkownika', null, (
          <>
          <Input value={displayName} onChange={setDisplayName}
            placeholder={t('display_name_ph') || 'Np. Jacek'} />
          <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginTop: SPACE.md }}>
            <Btn variant="accent"
              onClick={handleSaveName}
              disabled={savingName || !displayName.trim() || displayName.trim() === user.displayName}>
              {savingName ? (t('saving') || 'Zapisywanie…') : (t('save') || 'Zapisz')}
            </Btn>
            {nameStatus === 'saved' && (
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>✓ {t('saved') || 'Zapisano'}</span>
            )}
            {nameStatus === 'error' && (
              <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>{t('save_failed') || 'Błąd zapisu'}</span>
            )}
          </div>
          </>
        ))}

        {/* Security — change password row */}
        {wSection(t('security') || 'Bezpieczeństwo', null, (
          <div onClick={openPwModal} style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '13px 15px', borderRadius: 12, border: `1px solid ${ELEV.hairline}`, background: ELEV.sunken, cursor: 'pointer', minHeight: 52, WebkitTapHighlightColor: 'transparent' }}>
            <span style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, color: COLORS.textDim }}><RdIcon name="shield" size={18} /></span>
            <span style={{ flex: 1, fontFamily: FONT, fontSize: 16, fontWeight: 700, color: COLORS.text }}>{t('change_password') || 'Zmień hasło'}</span>
            <span style={{ color: COLORS.textMuted, display: 'flex' }}><RdIcon name="chevron" size={16} /></span>
          </div>
        ))}

        {/* Player data — claim CTA when unlinked */}
        {workspace && !linkedPlayer && wSection(t('profile_claim_section') || 'Profil gracza', null, (
          <>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, lineHeight: 1.5, marginBottom: SPACE.md }}>
              {t('profile_claim_empty') || 'Nie jesteś połączony z profilem gracza. Połącz się aby edytować swoje dane gracza, logować punkty i zobaczyć swoje statystyki.'}
            </div>
            <Btn variant="accent" onClick={() => { setClaimError(null); setClaimOpen(true); }}>
              {t('profile_claim_for_stats_btn') || 'Połącz profil żeby zobaczyć statystyki'}
            </Btn>
          </>
        ))}

        {/* Player data — self-edit form when linked */}
        {linkedPlayer && (
          <>
            {wSection(t('profile_player_label') || 'Dane gracza', t('profile_player_visible_short') || 'widoczne dla workspace', (
              <>
              <div style={{ display: 'grid', gridTemplateColumns: twoCol ? '1fr 1fr' : '1fr', gap: 14 }}>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_name') || 'Imię i nazwisko'}</div>
                  <Input value={player.name} onChange={(v) => setPlayer(p => ({ ...p, name: v }))} placeholder={t('profile_player_name_ph')} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_nickname') || 'Nick'}</div>
                  <Input value={player.nickname} onChange={(v) => setPlayer(p => ({ ...p, nickname: v }))} placeholder={t('profile_player_nickname_ph')} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_number') || 'Numer'}</div>
                  <Input value={player.number} onChange={(v) => setPlayer(p => ({ ...p, number: v }))} placeholder="07" />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_age') || 'Wiek'}</div>
                  <Input type="number" value={player.age} onChange={(v) => setPlayer(p => ({ ...p, age: v }))} placeholder="—" />
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_nationality') || 'Narodowość'}</div>
                  <Select value={player.nationality} onChange={(v) => setPlayer(p => ({ ...p, nationality: v }))} style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                    <option value="">— {t('profile_player_nationality_none') || 'brak'} —</option>
                    {NATIONALITIES.map(n => (<option key={n.code} value={n.code}>{n.flag} {n.name}</option>))}
                  </Select>
                </div>
                <div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>{t('profile_player_fav_bunker') || 'Ulubiony bunker'}</div>
                  <Input value={player.favoriteBunker} onChange={(v) => setPlayer(p => ({ ...p, favoriteBunker: v }))} placeholder={t('profile_player_fav_bunker_ph')} />
                </div>
              </div>

              {/* Read-only admin-managed context */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 14, padding: '10px 12px', borderRadius: RADIUS.md, background: ELEV.sunken, border: `1px solid ${ELEV.hairline}` }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', color: COLORS.textMuted }}>{t('profile_player_admin_fields') || 'Zarządzane przez admina'}</div>
                {linkedTeamName && (<div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}><span style={{ color: COLORS.textMuted }}>{t('profile_player_team_label') || 'Drużyna'}: </span>{linkedTeamName}</div>)}
                {linkedPlayer.pbliId && (<div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}><span style={{ color: COLORS.textMuted }}>{t('profile_player_pbli_label') || 'PBLI'}: </span>#{String(linkedPlayer.pbliId).replace(/^#/, '')}</div>)}
                {linkedPlayer.role && (<div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}><span style={{ color: COLORS.textMuted }}>{t('profile_player_role_label') || 'Pozycja'}: </span>{linkedPlayer.role}</div>)}
                {linkedPlayer.playerClass && (<div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}><span style={{ color: COLORS.textMuted }}>{t('profile_player_class_label') || 'Klasa'}: </span>{linkedPlayer.playerClass}</div>)}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginTop: 14 }}>
                <Btn variant="accent" onClick={handleSavePlayer} disabled={playerSaving || !playerDirty || !playerValid}>
                  {playerSaving ? (t('saving') || 'Zapisywanie…') : (t('profile_player_save') || 'Zapisz dane gracza')}
                </Btn>
                {playerStatus === 'saved' && (<span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>✓ {t('saved') || 'Zapisano'}</span>)}
                {playerStatus === 'error' && (<span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>{t('save_failed') || 'Błąd zapisu'}</span>)}
              </div>
              </>
            ))}

            {/* My stats entry point — own surface (single CTA per surface) */}
            <div style={{ ...wcard, padding: 20, marginBottom: 16 }}>
              <Btn variant="accent" size="lg" onClick={() => navigate(`/player/${linkedPlayer.id}/stats`)} style={{ width: '100%', minHeight: 48 }}>
                {t('profile_my_stats_btn') || 'Moje statystyki'}
              </Btn>
            </div>

            {/* Unlink — separate surface */}
            <div style={{ ...wcard, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: SPACE.sm, minHeight: 52 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>{linkedPlayer.nickname || linkedPlayer.name || t('profile_claim_section') || 'Profil gracza'}</div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2 }}>{t('profile_unlink_body') || 'Połączenie z profilem gracza'}</div>
              </div>
              <button type="button" onClick={() => setUnlinkOpen(true)} style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, padding: '10px 16px', minHeight: 44, borderRadius: 8, background: `${COLORS.danger}18`, color: COLORS.danger, border: `1px solid ${COLORS.danger}55`, cursor: 'pointer', letterSpacing: 0.3, WebkitTapHighlightColor: 'transparent' }}>{t('profile_unlink_btn') || 'Rozłącz'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <Screen archetype="detail" padBottom={false} style={{ minHeight: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: '/' }} title={t('my_profile') || 'Mój profil'} />}>
      {wide && wideBody}
      {!wide && (
      <div style={{ flex: 1, padding: wide ? '26px 24px 80px' : SPACE.lg, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: SPACE.lg, width: '100%', maxWidth: wide ? 760 : 640, margin: '0 auto', boxSizing: 'border-box' }}>

        {/* Identity block — avatar + email. Avatar URL editor removed per
            2026-04-23 decision (users have multiple player profiles with
            their own photos; admin manages via PlayerEditModal). */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: SPACE.md,
          padding: SPACE.md, borderRadius: RADIUS.lg,
          background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            background: ELEV.sunken, boxShadow: ELEV.innerTop,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontFamily: FONT, fontWeight: 800, color: COLORS.textDim,
            overflow: 'hidden', flexShrink: 0,
            border: `1px solid ${ELEV.hairlineStrong}`,
          }}>
            {user.photoURL ? (
              <img src={user.photoURL} alt="avatar"
                onError={(e) => { e.target.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (user.displayName || user.email || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{user.displayName || user.email}</div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{user.email}</div>
          </div>
        </div>

        {/* Display name */}
        <div>
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 600,
            color: COLORS.textMuted, textTransform: 'uppercase',
            letterSpacing: '.5px', padding: '0 4px 8px',
          }}>{t('display_name') || 'Nazwa użytkownika'}</div>
          <div style={{
            background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
            borderRadius: RADIUS.lg, padding: SPACE.md,
            display: 'flex', flexDirection: 'column', gap: SPACE.sm,
          }}>
            <Input value={displayName} onChange={setDisplayName}
              placeholder={t('display_name_ph') || 'Np. Jacek'} />
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
              <Btn variant="accent"
                onClick={handleSaveName}
                disabled={savingName || !displayName.trim() || displayName.trim() === user.displayName}>
                {savingName ? (t('saving') || 'Zapisywanie…') : (t('save') || 'Zapisz')}
              </Btn>
              {nameStatus === 'saved' && (
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>
                  ✓ {t('saved') || 'Zapisano'}
                </span>
              )}
              {nameStatus === 'error' && (
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
                  {t('save_failed') || 'Błąd zapisu'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Password */}
        <div>
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 600,
            color: COLORS.textMuted, textTransform: 'uppercase',
            letterSpacing: '.5px', padding: '0 4px 8px',
          }}>{t('security') || 'Bezpieczeństwo'}</div>
          <div onClick={openPwModal} style={{
            background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
            borderRadius: RADIUS.lg, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', minHeight: 52,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`, color: COLORS.textDim }}><RdIcon name="shield" size={17} /></span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500, color: COLORS.text }}>
                {t('change_password') || 'Zmień hasło'}
              </div>
            </div>
            <span style={{ color: COLORS.textMuted, display: 'flex' }}><RdIcon name="chevron" size={16} /></span>
          </div>
        </div>

        {/* Roles (§ 33.3) — read-only chips showing current workspace roles.
            Source: useWorkspace.roles (§ 49 canonical resolver). Rendered
            when the user is inside a workspace; empty-state note otherwise. */}
        <div>
          <div style={{
            fontFamily: FONT, fontSize: 11, fontWeight: 600,
            color: COLORS.textMuted, textTransform: 'uppercase',
            letterSpacing: '.5px', padding: '0 4px 8px',
          }}>{t('profile_roles_label') || 'Twoje role'}</div>
          <div style={{
            background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
            borderRadius: RADIUS.lg, padding: SPACE.md,
          }}>
            {!workspace ? (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
                fontStyle: 'italic',
              }}>
                {t('profile_roles_no_workspace') || 'Wybierz workspace aby zobaczyć swoje role.'}
              </div>
            ) : roles.length === 0 ? (
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
                fontStyle: 'italic',
              }}>
                {t('profile_roles_none') || 'Nie masz jeszcze przypisanej roli. Admin workspace przyznaje role.'}
              </div>
            ) : (
              <RoleChips selected={roles} onChange={() => {}} readOnly />
            )}
          </div>
        </div>

        {/* Player profile (§ 33.3 + § 49.8 Path A) — always rendered when
            the user is inside a workspace. Two states:
              1. Linked: self-edit form (6 whitelist fields) + Rozłącz action
              2. Not linked: self-claim CTA opens the picker modal
            Self-link Firestore rule (§ 33.3) accepts the write only when
            `resource.data.linkedUid == null`; ds.selfLinkPlayer re-checks
            inside a transaction to surface 'ALREADY_LINKED' races. */}
        {workspace && !linkedPlayer && (
          <div>
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600,
              color: COLORS.textMuted, textTransform: 'uppercase',
              letterSpacing: '.5px', padding: '0 4px 8px',
            }}>{t('profile_claim_section') || 'Profil gracza'}</div>
            <div style={{
              background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
              borderRadius: RADIUS.lg, padding: SPACE.md,
              display: 'flex', flexDirection: 'column', gap: SPACE.md,
            }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim,
                lineHeight: 1.5,
              }}>
                {t('profile_claim_empty') || 'Nie jesteś połączony z profilem gracza. Połącz się aby edytować swoje dane gracza, logować punkty i zobaczyć swoje statystyki.'}
              </div>
              {/* Brief E Gap 1 fallback — copy emphasizes stats incentive
                  for linkedPlayer=null users. Same single-CTA structure
                  (no duplicate Btn) keeps § 27 compliance; only the
                  button label changes via i18n key. */}
              <Btn variant="accent"
                onClick={() => { setClaimError(null); setClaimOpen(true); }}>
                {t('profile_claim_for_stats_btn') || 'Połącz profil żeby zobaczyć statystyki'}
              </Btn>
            </div>
          </div>
        )}

        {linkedPlayer && (
          <div>
            <div style={{
              fontFamily: FONT, fontSize: 11, fontWeight: 600,
              color: COLORS.textMuted, textTransform: 'uppercase',
              letterSpacing: '.5px', padding: '0 4px 4px',
            }}>{t('profile_player_label') || 'Dane gracza'}</div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim,
              padding: '0 4px 8px',
            }}>
              {t('profile_player_sub') || 'Zmiany widoczne w profilu gracza dla wszystkich członków workspace.'}
            </div>
            <div style={{
              background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
              borderRadius: RADIUS.lg, padding: SPACE.md,
              display: 'flex', flexDirection: 'column', gap: SPACE.md,
            }}>
              {/* Name + Nickname row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                    {t('profile_player_name') || 'Imię i nazwisko'}
                  </div>
                  <Input value={player.name}
                    onChange={(v) => setPlayer(p => ({ ...p, name: v }))}
                    placeholder={t('profile_player_name_ph')} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                    {t('profile_player_nickname') || 'Nick'}
                  </div>
                  <Input value={player.nickname}
                    onChange={(v) => setPlayer(p => ({ ...p, nickname: v }))}
                    placeholder={t('profile_player_nickname_ph')} />
                </div>
              </div>

              {/* Number + Age row */}
              <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                    {t('profile_player_number') || 'Numer'}
                  </div>
                  <Input value={player.number}
                    onChange={(v) => setPlayer(p => ({ ...p, number: v }))}
                    placeholder="07" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                    {t('profile_player_age') || 'Wiek'}
                  </div>
                  <Input type="number" value={player.age}
                    onChange={(v) => setPlayer(p => ({ ...p, age: v }))}
                    placeholder="—" />
                </div>
              </div>

              {/* Nationality */}
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                  {t('profile_player_nationality') || 'Narodowość'}
                </div>
                <Select value={player.nationality}
                  onChange={(v) => setPlayer(p => ({ ...p, nationality: v }))}
                  style={{ width: '100%', minHeight: TOUCH.minTarget }}>
                  <option value="">— {t('profile_player_nationality_none') || 'brak'} —</option>
                  {NATIONALITIES.map(n => (
                    <option key={n.code} value={n.code}>{n.flag} {n.name}</option>
                  ))}
                </Select>
              </div>

              {/* Favorite bunker — free text (bunker abbr list would require
                  the player's current layout context; too coupled for profile.
                  Leaving as free text lets the player type their preferred
                  bunker name across any layout). */}
              <div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                  {t('profile_player_fav_bunker') || 'Ulubiony bunker'}
                </div>
                <Input value={player.favoriteBunker}
                  onChange={(v) => setPlayer(p => ({ ...p, favoriteBunker: v }))}
                  placeholder={t('profile_player_fav_bunker_ph')} />
              </div>

              {/* Read-only context — team + PBLI ID + paintball role/class.
                  These are admin-managed; shown for context, not editable. */}
              <div style={{
                display: 'flex', flexDirection: 'column', gap: 4,
                padding: '10px 12px', borderRadius: RADIUS.md,
                background: COLORS.surface, border: `1px solid ${COLORS.border}`,
              }}>
                <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700,
                  letterSpacing: 0.5, textTransform: 'uppercase',
                  color: COLORS.textMuted }}>
                  {t('profile_player_admin_fields') || 'Zarządzane przez admina'}
                </div>
                {linkedTeamName && (
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                    <span style={{ color: COLORS.textMuted }}>{t('profile_player_team_label') || 'Drużyna'}: </span>{linkedTeamName}
                  </div>
                )}
                {linkedPlayer.pbliId && (
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                    <span style={{ color: COLORS.textMuted }}>{t('profile_player_pbli_label') || 'PBLI'}: </span>#{String(linkedPlayer.pbliId).replace(/^#/, '')}
                  </div>
                )}
                {linkedPlayer.role && (
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                    <span style={{ color: COLORS.textMuted }}>{t('profile_player_role_label') || 'Pozycja'}: </span>{linkedPlayer.role}
                  </div>
                )}
                {linkedPlayer.playerClass && (
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim }}>
                    <span style={{ color: COLORS.textMuted }}>{t('profile_player_class_label') || 'Klasa'}: </span>{linkedPlayer.playerClass}
                  </div>
                )}
              </div>

              {/* Save row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
                <Btn variant="accent"
                  onClick={handleSavePlayer}
                  disabled={playerSaving || !playerDirty || !playerValid}>
                  {playerSaving ? (t('saving') || 'Zapisywanie…') : (t('profile_player_save') || 'Zapisz dane gracza')}
                </Btn>
                {playerStatus === 'saved' && (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>
                    ✓ {t('saved') || 'Zapisano'}
                  </span>
                )}
                {playerStatus === 'error' && (
                  <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
                    {t('save_failed') || 'Błąd zapisu'}
                  </span>
                )}
              </div>
            </div>

            {/* Brief E Gap 1 — "Moje statystyki" entry point for linked
                players. Own surface so it doesn't compete with the
                "Zapisz dane gracza" amber CTA above (§ 27 anti-pattern:
                multiple CTAs on one card). Single primary action per
                surface keeps amber-as-interactive-accent discipline.
                Deep-links to PlayerStatsPage; auto-default scope=training
                + latest tid kicks in there per Brief E Gap 5. */}
            <div style={{
              marginTop: SPACE.sm,
              background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
              borderRadius: RADIUS.lg, padding: SPACE.md,
            }}>
              <Btn variant="accent" size="lg"
                onClick={() => navigate(`/player/${linkedPlayer.id}/stats`)}
                style={{ width: '100%', minHeight: 48 }}>
                {t('profile_my_stats_btn') || 'Moje statystyki'}
              </Btn>
            </div>

            {/* Rozłącz row — separate surface from the Save CTA above so the
                two actions don't compete on one card (§ 27 anti-pattern:
                multiple CTAs competing for attention). Follows the § 50.3
                Wyjdź workspace pattern (label + danger button in rightSlot). */}
            <div style={{
              marginTop: SPACE.sm,
              background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
              borderRadius: RADIUS.lg, padding: '10px 14px',
              display: 'flex', alignItems: 'center', gap: SPACE.sm,
              minHeight: 52,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text,
                }}>
                  {linkedPlayer.nickname || linkedPlayer.name || t('profile_claim_section') || 'Profil gracza'}
                </div>
                <div style={{
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2,
                }}>
                  {t('profile_unlink_body') || 'Połączenie z profilem gracza'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUnlinkOpen(true)}
                style={{
                  fontFamily: FONT, fontSize: 12, fontWeight: 700,
                  padding: '10px 16px', minHeight: 44,
                  borderRadius: 8,
                  background: `${COLORS.danger}18`,
                  color: COLORS.danger,
                  border: `1px solid ${COLORS.danger}55`,
                  cursor: 'pointer',
                  letterSpacing: 0.3,
                  WebkitTapHighlightColor: 'transparent',
                }}
              >{t('profile_unlink_btn') || 'Rozłącz'}</button>
            </div>
          </div>
        )}

      </div>
      )}

      {/* Self-claim modal (§ 49.8 Path A). Picker shows the FULL global catalog
          (Jacek 2026-06-14) — a player must see the whole DB to find their
          profile, not just their workspace's players. /players read is open, so
          rules-safe. The write side (ds.selfLinkPlayer) still respects the §85
          self-link carve-out gated on `isMember(resource.data.ownerWorkspaceId)`,
          so cross-workspace claims are denied (own-workspace claim fine). */}
      {workspace && !linkedPlayer && (
        <LinkProfileModal
          open={claimOpen}
          onClose={claimBusy ? undefined : () => setClaimOpen(false)}
          players={players}
          currentLinkedPlayer={null}
          onSelect={handleClaim}
          busy={claimBusy}
        />
      )}
      {claimError && claimOpen && (
        <div style={{
          position: 'fixed',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(90px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 360, width: 'calc(100% - 32px)',
          padding: '10px 14px',
          background: COLORS.surface,
          border: `1px solid ${COLORS.danger}55`,
          borderRadius: 10,
          color: COLORS.danger,
          fontFamily: FONT, fontSize: 13, fontWeight: 600,
          textAlign: 'center',
          zIndex: 9998,
        }}>{claimError}</div>
      )}

      {/* Unlink confirm modal */}
      <ConfirmModal
        open={unlinkOpen}
        onClose={() => !unlinking && setUnlinkOpen(false)}
        title={t('profile_unlink_title') || 'Rozłączyć profil gracza?'}
        message={t('profile_unlink_body') || 'Stracisz możliwość edytowania swoich danych gracza. Możesz połączyć się ponownie w dowolnym momencie.'}
        confirmLabel={unlinking ? (t('saving') || 'Zapisywanie…') : (t('profile_unlink_btn') || 'Rozłącz')}
        danger
        onConfirm={handleUnlink}
      />

      {/* Link / unlink toast — non-intrusive confirmation. Auto-dismisses
          via effect above. */}
      {linkToast && (
        <div style={{
          position: 'fixed',
          left: '50%', transform: 'translateX(-50%)',
          bottom: 'calc(130px + env(safe-area-inset-bottom, 0px))',
          maxWidth: 320, width: 'calc(100% - 32px)',
          padding: '10px 14px',
          background: COLORS.surface,
          border: `1px solid ${COLORS.success}55`,
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          color: COLORS.success,
          fontFamily: FONT, fontSize: 13, fontWeight: 700,
          textAlign: 'center',
          zIndex: 9998,
          pointerEvents: 'none',
        }}>{linkToast === 'linked'
          ? (t('profile_claim_linked_toast') || 'Profil połączony')
          : (t('profile_unlink_ok_toast') || 'Profil rozłączony')}</div>
      )}

      {/* Password change modal */}
      <Modal open={pwModalOpen} onClose={() => !pwSaving && setPwModalOpen(false)}
        title={t('change_password') || 'Zmień hasło'}
        footer={<>
          <Btn variant="default" onClick={() => setPwModalOpen(false)} disabled={pwSaving}>
            {t('cancel')}
          </Btn>
          <Btn variant="accent" onClick={handleChangePw}
            disabled={pwSaving || !currentPw || !newPw || !newPwConfirm}>
            {pwSaving ? (t('saving') || 'Zapisywanie…') : (t('save') || 'Zapisz')}
          </Btn>
        </>}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.md }}>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('current_password') || 'Obecne hasło'}
            </div>
            <Input type="password" value={currentPw} onChange={setCurrentPw} autoFocus />
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('new_password') || 'Nowe hasło'}
            </div>
            <Input type="password" value={newPw} onChange={setNewPw} />
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
              {t('confirm_new_password') || 'Powtórz nowe hasło'}
            </div>
            <Input type="password" value={newPwConfirm} onChange={setNewPwConfirm} />
          </div>
          {pwError && (
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
              {pwError}
            </div>
          )}
          {pwSuccess && (
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>
              ✓ {t('password_changed') || 'Hasło zostało zmienione.'}
            </div>
          )}
        </div>
      </Modal>
    </Screen>
  );
}
