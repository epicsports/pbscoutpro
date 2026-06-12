import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT } from '../../utils/theme';

/**
 * B4 — role-aware home, onboarding stage 1 (mockup-4, gate passed 2026-06-10).
 *
 * FreshWorkspaceChecklist — coach/admin fresh-workspace home: hero card with a
 * progress bar + derived-from-data checklist steps (NO onboarding-progress
 * collection — steps auto-complete from live signals and the checklist
 * disappears entirely once hasEvent ∧ hasLayout ∧ hasMembers). Admin sees a 5th
 * "names/zones" nudge row (does NOT gate disappearance). "Zrobię to później" is
 * session-scoped (sessionStorage in the parent) — nobody is imprisoned in
 * onboarding.
 *
 * §27: amber ONLY on the single "next" step (border + solid CTA); done steps
 * dimmed with success-green ✓; future steps ghost CTAs. The tinted next/done
 * backgrounds (#101a2e / #2a1f0a / #0d2218) are the gated mockup-4 values.
 */
export function FreshWorkspaceChecklist({ isAdmin, workspaceName, signals, configDone, onAddEvent, onLater }) {
  const { t } = useLanguage();
  const navigate = useNavigate();

  const steps = [
    { key: 'ws', done: true, title: t('b4_step1_title'), desc: t(isAdmin ? 'b4_step1_desc_admin' : 'b4_step1_desc', workspaceName) },
    { key: 'event', done: signals.hasEvent, title: t('b4_step2_title'), desc: t('b4_step2_desc'), cta: t('b4_step2_cta'), onPress: onAddEvent },
    { key: 'layout', done: signals.hasLayout, title: t('b4_step3_title'), desc: t('b4_step3_desc'), cta: t('b4_step3_cta'), onPress: () => navigate('/layouts') },
    { key: 'invite', done: signals.hasMembers, title: t('b4_step4_title'), desc: t('b4_step4_desc'), cta: t('b4_step4_cta'), onPress: () => navigate('/settings/members') },
    // Admin nudge row — config lives per-layout, so the catalog is the entry
    // until a layout exists; afterwards the same route lists the layouts to
    // configure. Done = any workspace overlay carries config content.
    ...(isAdmin ? [{ key: 'config', done: !!configDone, title: t('b4_step5_title'), desc: t('b4_step5_desc'), cta: t('b4_step5_cta'), onPress: () => navigate('/layouts') }] : []),
  ];
  const doneCount = steps.filter(s => s.done).length;
  const nextIdx = steps.findIndex(s => !s.done);

  return (
    <div data-testid="b4-checklist" style={{ padding: '16px 16px calc(100px + env(safe-area-inset-bottom, 0px))', display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 560, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
      {/* Hero — welcome + progress */}
      <div style={{ background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '18px 16px', textAlign: 'center' }}>
        <div style={{ fontFamily: FONT, fontSize: 17, fontWeight: 800, color: COLORS.text, marginBottom: 4 }}>{t('b4_welcome_title')}</div>
        <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.5 }}>{t('b4_welcome_sub', steps.length)}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
          <div style={{ flex: 1, height: 8, background: COLORS.surface, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: COLORS.accent, width: `${Math.round((doneCount / steps.length) * 100)}%`, transition: 'width .25s ease' }} />
          </div>
          <div data-testid="b4-progress" style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: COLORS.accent }}>{doneCount}/{steps.length}</div>
        </div>
      </div>

      <div style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 }}>{t('b4_sec_title')}</div>

      {steps.map((s, i) => {
        const isNext = i === nextIdx;
        return (
          <div key={s.key} data-testid={`b4-step-${s.key}`} data-state={s.done ? 'done' : isNext ? 'next' : 'todo'} style={{
            display: 'flex', alignItems: 'center', gap: 12, minHeight: 64,
            background: isNext ? '#101a2e' : COLORS.surfaceDark,
            border: `1px solid ${isNext ? COLORS.accent : COLORS.border}`,
            borderRadius: 12, padding: '12px 14px',
            opacity: s.done ? 0.65 : 1,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT, fontSize: 13, fontWeight: 800, flexShrink: 0,
              background: s.done ? '#0d2218' : isNext ? '#2a1f0a' : COLORS.surfaceLight,
              color: s.done ? COLORS.success : isNext ? COLORS.accent : COLORS.textDim,
              border: `1px solid ${s.done ? COLORS.success : isNext ? COLORS.accent : COLORS.border}`,
            }}>{s.done ? '✓' : i + 1}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: COLORS.text }}>{s.title}</div>
              <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textDim, marginTop: 2, lineHeight: 1.4 }}>{s.desc}</div>
            </div>
            {!s.done && s.cta && (
              <div role="button" data-testid={`b4-step-${s.key}-cta`} onClick={s.onPress} style={{
                marginLeft: 'auto', flexShrink: 0, minHeight: 44, display: 'flex', alignItems: 'center',
                padding: '0 14px', borderRadius: 10, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                fontFamily: FONT, fontSize: 13,
                ...(isNext
                  ? { background: COLORS.accent, color: '#0a0e17', fontWeight: 800 }
                  : { background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.textDim, fontWeight: 600 }),
              }}>{s.cta}</div>
            )}
          </div>
        );
      })}

      <div role="button" data-testid="b4-later" onClick={onLater} style={{
        textAlign: 'center', fontFamily: FONT, fontSize: 12.5, color: COLORS.textMuted,
        padding: 10, minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>{t('b4_later')}</div>
    </div>
  );
}

/**
 * B4 — scout empty state (no assignment, no active event): one clear path
 * instead of a void. NOTE: mockup-4 carried a "Dołącz do sesji kodem" CTA
 * assuming an existing kiosk join-by-code flow — that flow DOES NOT exist in
 * the codebase (kiosk is an overlay inside training scouting, no self-join
 * route), so the CTA is omitted rather than shipped dead; registered in
 * NEXT_TASKS as a follow-up requiring the join-by-code feature first.
 * Jacek ruling 2026-06-12 evening: the mockup CTA shows as an HONEST disabled
 * "wkrótce" control (never a dead button pretending to be live) until the
 * join-by-code feature ships (NEXT_TASKS, arc E stage 2).
 */
export function ScoutWaitingEmptyState() {
  const { t } = useLanguage();
  return (
    <div data-testid="b4-scout-empty" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, textAlign: 'center', padding: '64px 24px' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🎯</div>
      <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text }}>{t('b4_scout_title')}</div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.55, maxWidth: 280 }}>{t('b4_scout_text')}</div>
      <div data-testid="b4-scout-join-disabled" aria-disabled="true" style={{
        minHeight: 48, display: 'flex', alignItems: 'center', gap: 8, padding: '0 22px', borderRadius: 12,
        background: 'transparent', border: `1px solid ${COLORS.border}`, color: COLORS.textMuted,
        fontFamily: FONT, fontSize: 14, fontWeight: 700, marginTop: 4, cursor: 'default', opacity: 0.6,
      }}>
        {t('b4_scout_join_cta')}
        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, letterSpacing: '.4px', textTransform: 'uppercase' }}>{t('coming_soon_badge')}</span>
      </div>
      <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textMuted }}>{t('b4_scout_sub')}</div>
    </div>
  );
}

/**
 * B4 — player claim card (unclaimed account): deep-links to the EXISTING
 * claim flow (LinkProfileModal on /profile — §84/§85), never a new flow.
 * Rendered ABOVE the PPT picker (not instead of it) so the §110.1 unlinked
 * pendingSelfReports path stays fully usable.
 */
export function PlayerClaimCard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  return (
    <div data-testid="b4-claim" style={{ margin: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: 12, padding: '20px 16px' }}>
      <div style={{ width: 64, height: 64, borderRadius: 18, background: COLORS.surface, border: `1px solid ${COLORS.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>🏷️</div>
      <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: COLORS.text }}>{t('b4_claim_title')}</div>
      <div style={{ fontFamily: FONT, fontSize: 13, color: COLORS.textDim, lineHeight: 1.55, maxWidth: 280 }}>{t('b4_claim_text')}</div>
      <div role="button" data-testid="b4-claim-cta" onClick={() => navigate('/profile')} style={{
        minHeight: 48, display: 'flex', alignItems: 'center', padding: '0 22px', borderRadius: 12,
        background: COLORS.accent, color: '#0a0e17', fontFamily: FONT, fontSize: 14, fontWeight: 800,
        marginTop: 4, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
      }}>{t('b4_claim_cta')}</div>
      <div style={{ fontFamily: FONT, fontSize: 11.5, color: COLORS.textMuted }}>{t('b4_claim_sub')}</div>
    </div>
  );
}
