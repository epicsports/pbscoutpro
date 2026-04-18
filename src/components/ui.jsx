import React, { useRef, useState } from 'react';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH, LEAGUE_COLORS, responsive } from '../utils/theme';
import { useDevice } from '../hooks/useDevice';

// ─── Button ───
export function Btn({
  children, onClick, variant = 'default', size = 'md',
  disabled, style, title, active, type = 'button', className,
}) {
  const device = useDevice();
  const R = responsive(device.type);
  const sz = {
    sm: { fontSize: R.font.sm, padding: `${R.touch.btnPadYSm}px ${R.touch.btnPadXSm}px`, minHeight: device.isDesktop ? 30 : 36 },
    md: { fontSize: R.font.base, padding: `${R.touch.btnPadY}px ${R.touch.btnPadX}px`, minHeight: R.touch.minTarget },
    lg: { fontSize: R.font.lg, padding: `12px 20px`, minHeight: R.touch.targetLg },
  }[size] || {};

  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    border: '1px solid', borderRadius: 8, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: FONT, fontWeight: 600, transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap', ...sz,
  };
  const v = {
    default: { background: COLORS.surfaceLight, color: COLORS.text, borderColor: active ? COLORS.accent : COLORS.border, boxShadow: active ? `0 0 12px ${COLORS.accent}15` : 'none' },
    accent: { background: COLORS.accentGradient, color: '#000', borderColor: 'transparent', boxShadow: COLORS.accentGlow },
    danger: { background: COLORS.dangerDim, color: '#fca5a5', borderColor: COLORS.danger + '60' },
    ghost: { background: 'transparent', color: COLORS.textDim, borderColor: 'transparent', minHeight: 'auto' },
    success: { background: COLORS.successDim, color: '#86efac', borderColor: COLORS.success + '60' },
    win: { background: '#166534', color: '#86efac', borderColor: COLORS.success },
    loss: { background: '#991b1b', color: '#fca5a5', borderColor: COLORS.danger },
    timeout: { background: '#78350f', color: '#fcd34d', borderColor: COLORS.accent },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title} className={className}
      style={{ ...base, ...v[variant], ...style }}
      onMouseEnter={e => !disabled && (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={e => (e.currentTarget.style.filter = 'none')}>
      {children}
    </button>
  );
}

// ─── Input ───
export function Input({ value, onChange, placeholder, onKeyDown, onBlur, autoFocus, style, type = 'text' }) {
  const device = useDevice();
  const R = responsive(device.type);
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)}
      placeholder={placeholder} onKeyDown={onKeyDown} onBlur={onBlur} autoFocus={autoFocus}
      style={{
        width: '100%', padding: device.isDesktop ? '7px 12px' : '10px 14px', borderRadius: 8,
        border: `1px solid ${COLORS.border}`, background: COLORS.bg,
        color: COLORS.text, fontFamily: FONT, fontSize: device.isTouch ? 16 : R.font.base,
        outline: 'none', boxSizing: 'border-box', minHeight: R.touch.minTarget, ...style,
      }} />
  );
}

// ─── Select ───
export function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      style={{
        padding: '6px 10px', borderRadius: 6,
        border: `1px solid ${COLORS.border}`, background: COLORS.bg,
        color: COLORS.text, fontFamily: FONT, fontSize: TOUCH.fontSm,
        outline: 'none', minHeight: 44, ...style,
      }}>
      {children}
    </select>
  );
}

// ─── League Badge ───
export function LeagueBadge({ league }) {
  const c = LEAGUE_COLORS[league] || COLORS.textMuted;
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 800, padding: '2px 6px', borderRadius: 4,
      background: c + '20', color: c, border: `1px solid ${c}40`,
    }}>{league}</span>
  );
}

// ─── Action Sheet (⋮ menu) ───
export function ActionSheet({ open, onClose, actions = [] }) {
  if (!open) return null;
  return (
    <>
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 90, animation: 'fadeIn 0.15s ease-out',
      }} />
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: COLORS.surface, borderTop: `1px solid ${COLORS.border}`,
        borderRadius: '14px 14px 0 0', padding: '8px 0',
        paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight: '80dvh', overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: COLORS.border }} />
        </div>
        {actions.map((a, i) => {
          if (a.separator) return <div key={i} style={{ height: 1, background: COLORS.border, margin: '4px 16px' }} />;
          return (
            <div key={i} onClick={() => { a.onPress(); onClose(); }}
              style={{
                padding: '14px 20px', fontFamily: FONT, fontSize: TOUCH.fontBase,
                fontWeight: 600, cursor: 'pointer',
                color: a.danger ? COLORS.danger : COLORS.text,
              }}>
              {a.label}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function MoreBtn({ onClick }) {
  return (
    <div onClick={e => { e.stopPropagation(); onClick(); }}
      style={{
        width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', borderRadius: 8, flexShrink: 0,
        color: COLORS.textMuted, fontSize: 18, fontWeight: 700, lineHeight: 1,
      }}>⋮</div>
  );
}

// ─── Swipe-to-Delete Wrapper ───
export function SwipeDelete({ onDelete, children }) {
  const ref = useRef(null);
  const startX = useRef(0);
  const [offset, setOffset] = useState(0);
  const [swiping, setSwiping] = useState(false);
  const THRESHOLD = 80;

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    setSwiping(true);
  };
  const handleTouchMove = (e) => {
    if (!swiping) return;
    const dx = startX.current - e.touches[0].clientX;
    setOffset(Math.max(0, Math.min(THRESHOLD, dx)));
  };
  const handleTouchEnd = () => {
    setSwiping(false);
    setOffset(o => o >= THRESHOLD * 0.6 ? THRESHOLD : 0);
  };
  const reset = () => setOffset(0);

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 10, marginBottom: 6 }}>
      {/* Red delete zone behind */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: THRESHOLD,
        background: COLORS.danger, display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: '0 10px 10px 0',
      }}>
        <span onClick={() => { reset(); onDelete(); }}
          style={{ fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>
          Delete
        </span>
      </div>
      {/* Sliding content */}
      <div
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => { if (offset > 0) { reset(); } }}
        style={{
          transform: `translateX(${-offset}px)`,
          transition: swiping ? 'none' : 'transform 0.2s ease-out',
          position: 'relative', zIndex: 1,
        }}>
        {children}
      </div>
    </div>
  );
}

// ─── Card ───
export function Card({ icon, iconLeft, title, subtitle, onClick, actions, badge, children, onSwipeDelete, scheduled, live }) {
  const borderColor = live ? COLORS.accent + '40' : scheduled ? COLORS.border + '80' : COLORS.border;
  const inner = (
    <div className="fade-in" style={{
      background: COLORS.surfaceDark,
      border: `1px ${scheduled ? 'dashed' : 'solid'} ${borderColor}`,
      borderRadius: RADIUS.lg,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s',
      marginBottom: onSwipeDelete ? 0 : 6,
      minHeight: TOUCH.minTarget,
    }}
      onClick={onClick}
      onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = COLORS.borderActive)}
      onMouseLeave={e => (e.currentTarget.style.borderColor = borderColor)}>
      {iconLeft}
      {icon && <div style={{
        width: 36, height: 36, borderRadius: 8, background: COLORS.border,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, flexShrink: 0, color: COLORS.textDim,
      }}>{icon}</div>}
      <div style={{ flex: 1, minWidth: 0, opacity: scheduled ? 0.55 : 1 }}>
        <div style={{
          fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.base, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>{title}{badge}</div>
        {subtitle && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textMuted, marginTop: 3 }}>{subtitle}</div>}
        {children}
      </div>
      {actions}
      {onClick && !actions && <span style={{ color: COLORS.textMuted, flexShrink: 0 }}><Icons.Chev /></span>}
    </div>
  );
  if (onSwipeDelete) return <SwipeDelete onDelete={onSwipeDelete}>{inner}</SwipeDelete>;
  return inner;
}

// ─── Section Label (small uppercase) ───
export function SectionLabel({ children, color }) {
  return (
    <div style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
      color: color || COLORS.textMuted, letterSpacing: '1.5px',
      textTransform: 'uppercase', marginBottom: SPACE.sm,
    }}>{children}</div>
  );
}

// ─── Result Badge ───
export function ResultBadge({ result }) {
  const config = {
    W: { color: COLORS.success, bg: COLORS.success + '18' },
    L: { color: COLORS.danger, bg: COLORS.danger + '18' },
    D: { color: COLORS.accent, bg: COLORS.accent + '18' },
    LIVE: { color: '#000', bg: COLORS.accent, shadow: COLORS.accentGlow },
    FINAL: { color: COLORS.success, bg: COLORS.success + '15' },
  }[result] || {};
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 800,
      padding: '3px 7px', borderRadius: 5, letterSpacing: '0.3px',
      color: config.color, background: config.bg,
      boxShadow: config.shadow || 'none',
    }}>{result}</span>
  );
}

// ─── Score ───
export function Score({ value, color }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: FONT_SIZE.lg + 1, fontWeight: 800,
      letterSpacing: '-0.02em', color: color || COLORS.text,
    }}>{value}</span>
  );
}

// ─── Coaching Stats ───
export function CoachingStats({ stats }) {
  // stats: { dorito, snake, disco, zeeker, center, danger, sajgon, total }
  if (!stats || !stats.total) return null;
  const items = [
    { label: 'DORITO', value: stats.dorito, color: COLORS.danger },
    { label: 'SNAKE', value: stats.snake, color: COLORS.info },
    { label: 'CENTER', value: stats.center, color: COLORS.text },
    stats.danger !== null && { label: 'DANGER', value: stats.danger, color: COLORS.danger },
    stats.sajgon !== null && { label: 'SAJGON', value: stats.sajgon, color: COLORS.info },
    { label: 'DISCO', value: stats.disco, color: COLORS.bump },
    { label: 'ZEEKER', value: stats.zeeker, color: COLORS.zeeker || '#06b6d4' },
  ].filter(Boolean);
  return (
    <div style={{ display: 'flex', gap: 4, padding: `${SPACE.sm}px ${SPACE.lg}px`, flexWrap: 'wrap' }}>
      {items.map(item => (
        <div key={item.label} style={{
          flex: '1 0 auto', minWidth: 52, background: COLORS.surfaceDark, borderRadius: RADIUS.md - 2,
          padding: `${SPACE.sm}px 6px`, textAlign: 'center', border: `1px solid ${COLORS.border}`,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textMuted, fontWeight: 600, letterSpacing: '0.5px' }}>
            {item.label}
          </div>
          <div style={{ marginTop: 2 }}>
            <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800, color: item.color }}>
              {item.value ?? 0}%
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Section Title ───
export function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <h2 style={{
        fontFamily: FONT, fontSize: TOUCH.fontLg, fontWeight: 700, color: COLORS.text, margin: 0,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>{children}</h2>
      {right}
    </div>
  );
}

// ─── Empty State ───
export function EmptyState({ icon, text, subtitle }) {
  return (
    <div style={{
      textAlign: 'center', padding: '32px 20px', color: COLORS.textDim,
      fontFamily: FONT,
    }}>
      <div style={{ fontSize: 36, marginBottom: 10, opacity: 0.7 }}>{icon}</div>
      <div style={{ fontSize: TOUCH.fontSm, fontWeight: 600, color: COLORS.textDim }}>{text}</div>
      {subtitle && <div style={{ fontSize: TOUCH.fontXs, color: COLORS.textMuted, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

// ─── Modal ───
export function Modal({ open, onClose, title, children, footer, maxWidth: maxWidthProp }) {
  const device = useDevice();
  const R = responsive(device.type);
  const isMobile = device.isMobile;
  const [kbHeight, setKbHeight] = React.useState(0);

  // Lock body scroll when modal is open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Track keyboard height via visualViewport (iOS Safari)
  React.useEffect(() => {
    if (!open || !isMobile || !window.visualViewport) return;
    const onResize = () => {
      const kb = window.innerHeight - window.visualViewport.height;
      setKbHeight(kb > 50 ? kb : 0);
    };
    window.visualViewport.addEventListener('resize', onResize);
    return () => window.visualViewport.removeEventListener('resize', onResize);
  }, [open, isMobile]);

  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 100,
      padding: isMobile ? 0 : 20,
      touchAction: 'none',
      overscrollBehavior: 'contain',
    }} onClick={onClose} onTouchMove={e => e.stopPropagation()}>
      <div className={isMobile ? 'slide-up' : 'slide-in'} style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: isMobile ? '16px 16px 0 0' : R.modal.borderRadius,
        padding: isMobile ? '20px 16px 28px' : 20,
        minWidth: isMobile ? undefined : 300,
        maxWidth: isMobile ? undefined : (maxWidthProp || R.modal.maxWidth),
        width: '100%',
        maxHeight: isMobile ? `calc(92dvh - ${kbHeight}px)` : '85vh',
        overflowY: 'auto',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        overscrollBehavior: 'contain',
        marginBottom: isMobile && kbHeight > 0 ? kbHeight : undefined,
        paddingBottom: isMobile ? 'calc(20px + var(--safe-bottom, 0px))' : 20,
        transition: 'max-height 0.15s, margin-bottom 0.15s',
      }} onClick={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}
        ref={el => {
          if (!el || !isMobile) return;
          const handler = () => {
            const active = document.activeElement;
            if (active && el.contains(active)) {
              setTimeout(() => active.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
            }
          };
          el._focusHandler = handler;
          el.addEventListener('focusin', handler);
        }}>
        <h3 style={{
          fontFamily: FONT, fontSize: R.font.lg, fontWeight: 700, color: COLORS.text,
          margin: '0 0 16px',
        }}>{title}</h3>
        {children}
        {footer && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading ───
export function Loading({ text = 'Loading...' }) {
  return (
    <div style={{
      background: COLORS.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: FONT, color: COLORS.accent, fontSize: TOUCH.fontLg,
        animation: 'pulse 1.5s ease-in-out infinite',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>🎯 {text}</div>
    </div>
  );
}

// ─── Skeleton ───
const skeletonBase = {
  background: `linear-gradient(90deg, ${COLORS.surfaceLight} 25%, ${COLORS.border}30 50%, ${COLORS.surfaceLight} 75%)`,
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s infinite',
  borderRadius: 6,
};

export function Skeleton({ width = '100%', height = 16, style: s }) {
  return <div style={{ ...skeletonBase, width, height, ...s }} />;
}

export function SkeletonCard() {
  return (
    <div style={{ padding: '12px 14px', borderRadius: 10, background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
      <Skeleton width={32} height={32} style={{ borderRadius: '50%', flexShrink: 0 }} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Skeleton width="60%" height={14} />
        <Skeleton width="40%" height={10} />
      </div>
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return <>{Array.from({ length: count }, (_, i) => <SkeletonCard key={i} />)}</>;
}

// ─── Score Badge ───
export function ScoreBadge({ points }) {
  if (!points?.length) return null;
  const w = points.filter(p => p.outcome === 'win').length;
  const l = points.filter(p => p.outcome === 'loss').length;
  const t = points.filter(p => p.outcome === 'timeout').length;
  return (
    <span style={{ display: 'flex', gap: 5, fontFamily: FONT, fontSize: TOUCH.fontSm, fontWeight: 800 }}>
      <span style={{ color: COLORS.win }}>{w}W</span>
      <span style={{ color: COLORS.loss }}>{l}L</span>
      {t > 0 && <span style={{ color: COLORS.timeout }}>{t}T</span>}
    </span>
  );
}

// ─── Year Badge ───
export function YearBadge({ year }) {
  return (
    <span style={{
      fontFamily: FONT, fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
      background: COLORS.textMuted + '20', color: COLORS.textDim,
    }}>{year}</span>
  );
}

// ─── App Footer ───
// ── ConfirmModal — reusable delete/destructive action confirmation ──
// Usage: <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)}
//           title="Delete match?" message={`Delete "${name}"?`}
//           onConfirm={() => { ds.deleteX(deleteId); setDeleteId(null); }}
//           confirmLabel="Delete" danger />
export function ConfirmModal({ open, onClose, title, message, onConfirm, confirmLabel = 'Confirm', danger = false,
  requirePassword, passwordLabel = 'Enter workspace password to confirm...',
  password, onPasswordChange }) {
  const passwordMatch = requirePassword
    ? requirePassword === password?.toLowerCase().trim().replace(/^##/, '').replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '').slice(0, 40)
    : true;
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<>
        <Btn variant="default" onClick={onClose}>Cancel</Btn>
        <Btn variant={danger ? 'danger' : 'accent'}
          disabled={!passwordMatch}
          onClick={onConfirm}>
          {danger ? <Icons.Trash /> : <Icons.Check />} {confirmLabel}
        </Btn>
      </>}>
      {message && <p style={{ fontFamily: 'var(--font)', fontSize: 15, color: 'var(--color-text-dim)', margin: '0 0 12px' }}>{message}</p>}
      {requirePassword && (
        <Input value={password} onChange={onPasswordChange}
          placeholder={passwordLabel} autoFocus />
      )}
    </Modal>
  );
}

// ── PlayerChip — player slot button, used in MatchPage + TacticPage ──
// Usage: <PlayerChip idx={i} player={p} label="P1" color="#f00"
//          selected={selPlayer===i} eliminated={isElim} hasBump={hasBump}
//          shotCount={2} onClick={...} onRemove={...} />
export function PlayerChip({ idx, player, label, color, selected, eliminated, hasBump, bumpDuration, shotCount,
  onClick, onRemove, size = 'md', style: extraStyle }) {
  const sizeStyle = size === 'sm'
    ? { padding: '5px 10px', borderRadius: 16, minHeight: 44, fontSize: 12 }
    : { padding: '8px 14px', borderRadius: 20, minHeight: 44, fontSize: 14 };
  return (
    <div onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: size === 'sm' ? 4 : 5,
      fontFamily: 'var(--font)', fontWeight: 700, cursor: player || !onClick ? 'pointer' : 'default',
      background: player ? (eliminated ? 'rgba(100,100,100,0.1)' : color + '20') : 'var(--color-surface)',
      border: `2px solid ${player ? color + (selected ? 'ff' : '50') : (selected ? 'var(--color-accent)' : 'var(--color-border)')}`,
      color: player ? (eliminated ? 'var(--color-text-muted)' : color) : 'var(--color-text-muted)',
      opacity: eliminated ? 0.6 : 1,
      ...sizeStyle, ...extraStyle,
    }}>
      <span style={{ width: size === 'sm' ? 7 : 10, height: size === 'sm' ? 7 : 10,
        borderRadius: '50%', background: player ? color : 'rgba(150,150,150,0.3)', flexShrink: 0 }} />
      {label}
      {eliminated && <span>💀</span>}
      {hasBump && bumpDuration && <span style={{ fontSize: 10, color: 'var(--color-bump)' }}>⏱{bumpDuration}s</span>}
      {shotCount > 0 && <span style={{ fontSize: 10 }}>🎯{shotCount}</span>}
      {player && onRemove && (
        <span onClick={e => { e.stopPropagation(); onRemove(); }}
          style={{ cursor: 'pointer', opacity: 0.4, fontSize: 14, marginLeft: 4 }}>×</span>
      )}
    </div>
  );
}

// ─── Icons ───
export const Icons = {
  Plus: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Check: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Trash: () => <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4m1.5 0l-.5 8a1 1 0 01-1 1h-5a1 1 0 01-1-1l-.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Edit: () => <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Back: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Chev: () => <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  ChevronRight: () => <svg width="14" height="14" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Reset: () => <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><path d="M2 2v4h4M12 12V8H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 9A5 5 0 019.9 3.1M10.5 5A5 5 0 014.1 10.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Heat: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1" opacity="0.6"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>,
  Target: () => <svg width="16" height="16" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/></svg>,
  Users: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M11 9.5c1.8 0 3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Trophy: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4H2.5a1 1 0 00-1 1v1a2 2 0 002 2H4M12 4h1.5a1 1 0 011 1v1a2 2 0 01-2 2H12M8 10v2M5 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  DB: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3"/><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.3"/><path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Image: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1.5 11l3-3 2 2 3-3 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Search: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Skull: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="8.5" cy="5.5" r="1" fill="currentColor"/><path d="M5.5 8.5v2M7 8.5v2M8.5 8.5v2" stroke="currentColor" strokeWidth="0.8"/></svg>,
  Filter: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 3h12M4 8h8M6 13h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Swap: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 6l-2 2 2 2M12 6l2 2-2 2M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  // Toolbar icons (replacing emoji)
  Wave: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M1 8c2-3 4 3 6 0s4 3 6 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  Tag: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M2 2h5.5l6 6-5.5 5.5-6-6V2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/></svg>,
  Zone: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1l1.8 5.5H15l-4.2 3 1.6 5.5L8 12l-4.4 3 1.6-5.5-4.2-3h5.2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
  Flame: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><path d="M8 1C8 1 3 6 3 9.5a5 5 0 0010 0C13 6 8 1 8 1z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 8c1 0 2 1.2 2 2.5S9 13 8 13s-2-1.2-2-2.5S7 8 8 8z" stroke="currentColor" strokeWidth="1" opacity="0.6"/></svg>,
  Zoom: () => <svg width="18" height="18" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10.5 10.5L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>,
};

// ─── Form Controls ───

export function Checkbox({ label, checked, onChange, style: s }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
      fontFamily: FONT, fontSize: TOUCH.fontXs, color: checked ? COLORS.text : COLORS.textDim, ...s }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
        style={{ accentColor: COLORS.accent, width: 16, height: 16 }} />
      {label}
    </label>
  );
}

export function Slider({ label, value, onChange, min = 0, max = 100, step = 1, color = COLORS.accent, style: s }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, ...s }}>
      {label && <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: color, fontWeight: 700, minWidth: 48 }}>{label}</span>}
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: color }} />
      <span style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, minWidth: 28 }}>{value}</span>
    </div>
  );
}

export function TextArea({ value, onChange, placeholder, rows = 3, style: s }) {
  return (
    <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
      style={{
        fontFamily: FONT, fontSize: TOUCH.fontSm, padding: '8px 10px', borderRadius: 8,
        background: COLORS.bg, color: COLORS.text, border: `1px solid ${COLORS.border}`,
        width: '100%', resize: 'vertical', boxSizing: 'border-box', minHeight: 44, ...s,
      }} />
  );
}

export function FormField({ label, children, style: s }) {
  return (
    <div style={{ ...s }}>
      {label && <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginBottom: 4 }}>{label}</div>}
      {children}
    </div>
  );
}

// SideTag — canonical visual marker for field side. DESIGN_DECISIONS.md § 34.3.
export function SideTag({ side }) {
  const letter = side === 'dorito' ? 'D' : side === 'snake' ? 'S' : 'C';
  return (
    <span style={{
      minWidth: 18, height: 18, padding: '0 5px',
      borderRadius: 3,
      background: COLORS.surfaceLight,
      color: COLORS.textDim,
      fontFamily: FONT, fontSize: 10, fontWeight: 800,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    }}>{letter}</span>
  );
}
