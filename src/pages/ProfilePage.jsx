import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import PageHeader from '../components/PageHeader';
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
import { usePlayers, useTeams } from '../hooks/useFirestore';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../utils/theme';

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
  const { teams } = useTeams();
  const { players } = usePlayers();

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

  if (!user) {
    return (
      <div style={{ minHeight: '100dvh', background: COLORS.bg }}>
        <PageHeader back={{ to: '/' }} title={t('my_profile') || 'Mój profil'} />
        <div style={{ padding: SPACE.lg, textAlign: 'center', color: COLORS.textMuted }}>
          {t('not_signed_in') || 'Nie jesteś zalogowany.'}
        </div>
      </div>
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

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/' }} title={t('my_profile') || 'Mój profil'} />

      <div style={{ flex: 1, padding: SPACE.lg, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>

        {/* Identity block — avatar + email. Avatar URL editor removed per
            2026-04-23 decision (users have multiple player profiles with
            their own photos; admin manages via PlayerEditModal). */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: SPACE.md,
          padding: SPACE.md, borderRadius: RADIUS.lg,
          background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: COLORS.surfaceLight,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontFamily: FONT, fontWeight: 800, color: COLORS.textMuted,
            overflow: 'hidden', flexShrink: 0,
            border: `2px solid ${COLORS.border}`,
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
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
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
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.lg, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
            cursor: 'pointer', minHeight: 52,
            WebkitTapHighlightColor: 'transparent',
          }}>
            <span style={{ fontSize: 18, width: 22, textAlign: 'center', opacity: 0.8 }}>🔒</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500, color: COLORS.text }}>
                {t('change_password') || 'Zmień hasło'}
              </div>
            </div>
            <span style={{ fontFamily: FONT, fontSize: 14, color: COLORS.borderLight }}>›</span>
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
            background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
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
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              borderRadius: RADIUS.lg, padding: SPACE.md,
              display: 'flex', flexDirection: 'column', gap: SPACE.md,
            }}>
              <div style={{
                fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim,
                lineHeight: 1.5,
              }}>
                {t('profile_claim_empty') || 'Nie jesteś połączony z profilem gracza. Połącz się aby edytować swoje dane gracza i logować punkty.'}
              </div>
              <Btn variant="accent"
                onClick={() => { setClaimError(null); setClaimOpen(true); }}>
                {t('profile_claim_btn') || 'Połącz z profilem gracza'}
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
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
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
                    placeholder="Jan Kowalski" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginBottom: 4 }}>
                    {t('profile_player_nickname') || 'Nick'}
                  </div>
                  <Input value={player.nickname}
                    onChange={(v) => setPlayer(p => ({ ...p, nickname: v }))}
                    placeholder="Pseudonim" />
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
                  placeholder="Np. Dog, Snake 50, D3" />
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

            {/* Rozłącz row — separate surface from the Save CTA above so the
                two actions don't compete on one card (§ 27 anti-pattern:
                multiple CTAs competing for attention). Follows the § 50.3
                Wyjdź workspace pattern (label + danger button in rightSlot). */}
            <div style={{
              marginTop: SPACE.sm,
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
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

      {/* Self-claim modal (§ 49.8 Path A). Reuses the admin LinkProfileModal
          component; the rules distinction is on the Firestore write side
          (ds.selfLinkPlayer respects the self-link carve-out). */}
      {workspace && !linkedPlayer && (
        <LinkProfileModal
          open={claimOpen}
          onClose={claimBusy ? undefined : () => setClaimOpen(false)}
          players={players || []}
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
    </div>
  );
}
