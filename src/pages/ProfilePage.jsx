import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  updateProfile, updatePassword, reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import PageHeader from '../components/PageHeader';
import { Btn, Input, Modal } from '../components/ui';
import { auth } from '../services/firebase';
import { useLanguage } from '../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE } from '../utils/theme';

/**
 * ProfilePage — account settings for the logged-in Firebase user.
 *
 * Currently supports:
 * - Display name edit (Firebase Auth updateProfile)
 * - Password change (requires current password for reauthentication)
 *
 * Planned (Faza B):
 * - Avatar upload (requires Storage + Resize Images extension)
 */
export default function ProfilePage() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const user = auth.currentUser;

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

  // Avatar URL state
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoStatus, setPhotoStatus] = useState(null);

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
      // Reauthenticate with current password first (required by Firebase).
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

  const handleSavePhoto = async () => {
    setPhotoSaving(true); setPhotoStatus(null);
    try {
      await updateProfile(user, { photoURL: photoURL.trim() || null });
      setPhotoStatus('saved');
      setTimeout(() => setPhotoStatus(null), 2500);
    } catch (e) {
      console.error(e);
      setPhotoStatus('error');
    }
    setPhotoSaving(false);
  };

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader back={{ to: '/' }} title={t('my_profile') || 'Mój profil'} />

      <div style={{ flex: 1, padding: SPACE.lg, paddingBottom: 80, display: 'flex', flexDirection: 'column', gap: SPACE.lg }}>

        {/* Avatar with URL */}
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: SPACE.md,
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
            {photoURL ? (
              <img src={photoURL} alt="avatar"
                onError={(e) => { e.target.style.display = 'none'; }}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              (user.displayName || user.email || '?').charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: COLORS.text,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{user.displayName || '—'}</div>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 2, marginBottom: 8,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{user.email}</div>
            <Input
              value={photoURL}
              onChange={setPhotoURL}
              placeholder="Link do zdjęcia (https://...)"
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, marginTop: 8 }}>
              <Btn variant="accent"
                onClick={handleSavePhoto}
                disabled={photoSaving || (photoURL || '') === (user.photoURL || '')}>
                {photoSaving ? (t('saving') || 'Zapisywanie…') : (t('save') || 'Zapisz')}
              </Btn>
              {photoStatus === 'saved' && (
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.success }}>
                  ✓ {t('saved') || 'Zapisano'}
                </span>
              )}
              {photoStatus === 'error' && (
                <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger }}>
                  {t('save_failed') || 'Błąd zapisu'}
                </span>
              )}
            </div>
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

      </div>

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
