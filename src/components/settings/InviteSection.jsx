import React, { useState } from 'react';
import * as ds from '../../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { useLanguage } from '../../hooks/useLanguage';
import { Btn } from '../ui';

/**
 * Model B invite generator. Single-select role (from `roles`) → createInvite →
 * copyable magic link `#/invite/{token}` + expiry. Hosted on the two admin
 * surfaces: WorkspacesAdminPage (super_admin, may include 'admin') and
 * MembersPage (workspace_admin, non-admin roles). The /invites create-gating
 * rule enforces who may issue which role.
 *
 * @param {string} slug - target workspace
 * @param {string[]} roles - selectable roles (first = default)
 */
export default function InviteSection({ slug, roles }) {
  const { t } = useLanguage();
  const [role, setRole] = useState(roles[0]);
  const [link, setLink] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    if (busy) return;
    setBusy(true); setError(null); setCopied(false);
    try {
      const { token, expiresAt: exp } = await ds.createInvite(slug, role);
      setLink(`${window.location.origin}${import.meta.env.BASE_URL}#/invite/${token}`);
      setExpiresAt(exp);
    } catch (e) {
      console.error('createInvite failed:', e);
      setError(e?.message || 'Failed to create invite');
    } finally {
      setBusy(false);
    }
  };

  const copy = async () => {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.sm }}>
      {roles.length > 1 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.xs }}>
          {roles.map(r => {
            const sel = r === role;
            return (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  minHeight: TOUCH.minTarget, padding: `${SPACE.xs}px ${SPACE.md}px`,
                  borderRadius: RADIUS.full,
                  background: sel ? `${COLORS.accent}20` : COLORS.surfaceLight,
                  border: `1px solid ${sel ? COLORS.accent : COLORS.border}`,
                  color: sel ? COLORS.accent : COLORS.textDim,
                  fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700, cursor: 'pointer',
                }}
              >{t(`role_${r}`) || r}</button>
            );
          })}
        </div>
      )}

      <Btn variant="accent" size="lg" onClick={generate} disabled={busy} style={{ width: '100%' }}>
        {busy ? (t('loading') || 'Loading…') : (t('invite_generate') || 'Generate invite link')}
      </Btn>

      {error && (
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.danger }}>{error}</div>
      )}

      {link && (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: SPACE.xs,
          padding: SPACE.sm, background: COLORS.surfaceDark,
          border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
        }}>
          <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.text, wordBreak: 'break-all' }}>{link}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: SPACE.sm }}>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600, color: COLORS.textMuted }}>
              {(t('invite_expires') || 'Expires')} {expiresAt ? new Date(expiresAt).toLocaleDateString() : ''} · {t(`role_${role}`) || role}
            </span>
            <Btn variant="default" size="md" onClick={copy}>
              {copied ? (t('invite_copied') || 'Copied!') : (t('invite_copy') || 'Copy')}
            </Btn>
          </div>
        </div>
      )}
    </div>
  );
}
