/**
 * PbleaguesOnboardingPage — § 38.12 mandatory account linking.
 *
 * Full-screen gate. No header, no nav. User must enter their PBLI ID (from
 * pbleagues.com/profile) to link the Firebase uid to a roster player doc.
 *
 * Route: `/onboarding/pbleagues` (protected via AuthGate in App.jsx —
 * requires auth but not workspace role).
 */
import React, { useState } from 'react';
import { Btn, Input } from '../components/ui';
import { useWorkspace } from '../hooks/useWorkspace';
import { useLanguage } from '../hooks/useLanguage';
import { parsePbliId, PBLI_ID_FULL_REGEX } from '../utils/roleUtils';
import { findPlayerByPbliId, linkPbliPlayer } from '../services/dataService';
import { onPlayerLinked } from '../services/playerPerformanceTrackerService';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, TOUCH } from '../utils/theme';

export default function PbleaguesOnboardingPage() {
  const { t } = useLanguage();
  const { workspace, user, signOutUser } = useWorkspace();
  const [raw, setRaw] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const parsed = parsePbliId(raw);
  const isValid = !parsed.error;
  const canSubmit = isValid && !submitting;

  async function handleSubmit() {
    if (!canSubmit || !workspace?.slug || !user?.uid) return;
    setError(null);
    setSubmitting(true);
    try {
      const matches = await findPlayerByPbliId(workspace.slug, parsed.systemId);
      if (matches.length === 0) {
        setError(t('onboarding_pbli_error_not_found'));
        setSubmitting(false);
        return;
      }
      if (matches.length > 1) {
        // Data bug — log to console, take first match as a best-effort. A
        // disambiguation picker would be the proper fix but this should
        // never happen in practice.
        console.warn('[PbliOnboarding] multiple pbliId matches:', matches.map(m => m.id));
      }
      const match = matches[0];
      if (match.linkedUid && match.linkedUid !== user.uid) {
        setError(t('onboarding_pbli_error_already_linked'));
        setSubmitting(false);
        return;
      }
      await linkPbliPlayer(workspace.slug, match.id, user.uid, parsed.full);
      // Move any PPT logs the user wrote while unlinked over to the
      // canonical player path. Best-effort; non-blocking for the success
      // confirmation.
      onPlayerLinked(user.uid, match.id).catch(err => {
        console.warn('PPT migrate-on-link failed (non-fatal):', err);
      });
      setSuccess(true);
    } catch (e) {
      if (e?.message === 'ALREADY_LINKED') {
        setError(t('onboarding_pbli_error_already_linked'));
      } else {
        setError(`${t('onboarding_pbli_error_invalid_format')}${e?.code ? ` (${e.code})` : ''}`);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const outer = {
    position: 'fixed', inset: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: COLORS.bg,
    padding: SPACE.lg,
    overflowY: 'auto',
    zIndex: 50,
  };
  const card = {
    width: '100%', maxWidth: 440,
    background: COLORS.surface,
    border: `1px solid ${COLORS.border}`,
    borderRadius: RADIUS.xl,
    padding: `${SPACE.xl}px ${SPACE.lg}px`,
    display: 'flex', flexDirection: 'column', gap: SPACE.md,
  };

  if (success) {
    return (
      <div style={outer}>
        <div style={card}>
          <div style={{
            fontFamily: FONT, fontSize: 21, fontWeight: 700,
            color: COLORS.text, letterSpacing: '-0.01em',
          }}>{t('onboarding_pbli_success_title')}</div>
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.textDim,
            lineHeight: 1.5,
          }}>{t('onboarding_pbli_success_body')}</div>
          <Btn
            variant="accent"
            size="lg"
            onClick={() => window.location.reload()}
            style={{ width: '100%', justifyContent: 'center', minHeight: 52 }}
          >{t('onboarding_pbli_success_refresh')}</Btn>
          <Btn
            variant="ghost"
            onClick={signOutUser}
            style={{ width: '100%', justifyContent: 'center' }}
          >{t('pending_approval_signout')}</Btn>
        </div>
      </div>
    );
  }

  return (
    <div style={outer}>
      <div style={card}>
        <div style={{
          fontFamily: FONT, fontSize: 21, fontWeight: 700,
          color: COLORS.text, letterSpacing: '-0.01em',
        }}>{t('onboarding_pbli_title')}</div>

        <div style={{
          fontFamily: FONT, fontSize: FONT_SIZE.base, color: COLORS.textDim,
          lineHeight: 1.5,
        }}>{t('onboarding_pbli_body')}</div>

        <a
          href="https://pbleagues.com"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            minHeight: TOUCH.minTarget,
            padding: `${SPACE.sm}px ${SPACE.md}px`,
            background: 'transparent',
            border: `1px solid ${COLORS.border}`,
            borderRadius: RADIUS.md,
            color: COLORS.textDim,
            fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
            textDecoration: 'none',
          }}
        >{t('onboarding_pbli_open_pbleagues')}</a>

        <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.xs }}>
          <label style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700,
            color: COLORS.textMuted, letterSpacing: 0.4, textTransform: 'uppercase',
          }}>{t('onboarding_pbli_input_label')}</label>
          {error && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.danger,
              padding: `${SPACE.xs}px ${SPACE.sm}px`,
              background: `${COLORS.danger}15`,
              border: `1px solid ${COLORS.danger}40`,
              borderRadius: RADIUS.sm,
              lineHeight: 1.5,
            }}>{error}</div>
          )}
          <Input
            value={raw}
            onChange={setRaw}
            placeholder={t('onboarding_pbli_input_placeholder')}
            autoFocus
          />
          <div style={{
            fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted,
            lineHeight: 1.5,
          }}>{t('onboarding_pbli_input_help')}</div>
          {raw && parsed.error && (
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.danger,
            }}>{t('onboarding_pbli_error_invalid_format')}</div>
          )}
        </div>

        <Btn
          variant="accent"
          size="lg"
          onClick={handleSubmit}
          disabled={!canSubmit}
          style={{ width: '100%', justifyContent: 'center', minHeight: 52 }}
        >{t('onboarding_pbli_submit')}</Btn>

        <Btn
          variant="ghost"
          onClick={signOutUser}
          style={{ width: '100%', justifyContent: 'center' }}
        >{t('pending_approval_signout')}</Btn>
      </div>
    </div>
  );
}
