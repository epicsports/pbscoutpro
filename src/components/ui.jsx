import React from 'react';
import { COLORS, FONT, LEAGUE_COLORS } from '../utils/theme';

// ─── Button ───
export function Btn({
  children, onClick, variant = 'default', size = 'md',
  disabled, style, title, active, type = 'button',
}) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid',
    borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: FONT, fontWeight: 600, transition: 'all 0.15s',
    opacity: disabled ? 0.4 : 1, whiteSpace: 'nowrap',
    fontSize: size === 'sm' ? 10 : size === 'lg' ? 14 : 12,
    padding: size === 'sm' ? '3px 7px' : size === 'lg' ? '10px 18px' : '6px 12px',
  };
  const v = {
    default: { background: COLORS.surfaceLight, color: COLORS.text, borderColor: active ? COLORS.accent : COLORS.border },
    accent: { background: COLORS.accent, color: '#000', borderColor: COLORS.accent },
    danger: { background: COLORS.dangerDim, color: '#fca5a5', borderColor: COLORS.danger + '60' },
    ghost: { background: 'transparent', color: COLORS.textDim, borderColor: 'transparent' },
    success: { background: COLORS.successDim, color: '#86efac', borderColor: COLORS.success + '60' },
    win: { background: '#166534', color: '#86efac', borderColor: COLORS.success },
    loss: { background: '#991b1b', color: '#fca5a5', borderColor: COLORS.danger },
    timeout: { background: '#78350f', color: '#fcd34d', borderColor: COLORS.accent },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled} title={title}
      style={{ ...base, ...v[variant], ...style }}
      onMouseEnter={(e) => !disabled && (e.currentTarget.style.filter = 'brightness(1.15)')}
      onMouseLeave={(e) => (e.currentTarget.style.filter = 'none')}>
      {children}
    </button>
  );
}

// ─── Input ───
export function Input({ value, onChange, placeholder, onKeyDown, autoFocus, style, type = 'text' }) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder} onKeyDown={onKeyDown} autoFocus={autoFocus}
      style={{
        width: '100%', padding: '8px 12px', borderRadius: 6,
        border: `1px solid ${COLORS.border}`, background: COLORS.bg,
        color: COLORS.text, fontFamily: FONT, fontSize: 13, outline: 'none',
        boxSizing: 'border-box', ...style,
      }} />
  );
}

// ─── Select ───
export function Select({ value, onChange, children, style }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '3px 6px', borderRadius: 4,
        border: `1px solid ${COLORS.border}`, background: COLORS.bg,
        color: COLORS.text, fontFamily: FONT, fontSize: 10, outline: 'none', ...style,
      }}>
      {children}
    </select>
  );
}

// ─── League Badge ───
export function LeagueBadge({ league }) {
  const color = LEAGUE_COLORS[league] || COLORS.textMuted;
  return (
    <span style={{
      fontFamily: FONT, fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
      background: color + '20', color, border: `1px solid ${color}40`,
    }}>
      {league}
    </span>
  );
}

// ─── Card ───
export function Card({ icon, title, subtitle, onClick, actions, badge, children }) {
  return (
    <div className="fade-in" style={{
      background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: 8,
      padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10,
      cursor: onClick ? 'pointer' : 'default', transition: 'border-color 0.15s', marginBottom: 6,
    }}
      onClick={onClick}
      onMouseEnter={(e) => onClick && (e.currentTarget.style.borderColor = COLORS.borderActive)}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = COLORS.border)}>
      <div style={{
        width: 32, height: 32, borderRadius: 7, background: COLORS.accent + '14',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, flexShrink: 0, color: COLORS.accent,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontFamily: FONT, fontWeight: 700, fontSize: 12, color: COLORS.text,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {title}{badge}
        </div>
        {subtitle && (
          <div style={{ fontFamily: FONT, fontSize: 10, color: COLORS.textDim, marginTop: 1 }}>
            {subtitle}
          </div>
        )}
        {children}
      </div>
      {actions}
      {onClick && (
        <span style={{ color: COLORS.textMuted, flexShrink: 0 }}>
          <Icons.Chev />
        </span>
      )}
    </div>
  );
}

// ─── Section Title ───
export function SectionTitle({ children, right }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
      <h2 style={{
        fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text, margin: 0,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {children}
      </h2>
      {right}
    </div>
  );
}

// ─── Empty State ───
export function EmptyState({ icon, text }) {
  return (
    <div style={{
      textAlign: 'center', padding: '36px 20px', color: COLORS.textMuted,
      fontFamily: FONT, fontSize: 12,
    }}>
      <div style={{ fontSize: 34, marginBottom: 10 }}>{icon}</div>
      {text}
    </div>
  );
}

// ─── Modal ───
export function Modal({ open, onClose, title, children, footer }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 100, padding: 20,
    }} onClick={onClose}>
      <div className="slide-in" style={{
        background: COLORS.surface, border: `1px solid ${COLORS.border}`,
        borderRadius: 12, padding: 18, minWidth: 280, maxWidth: 360, width: '100%',
      }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{
          fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORS.text,
          margin: '0 0 14px',
        }}>
          {title}
        </h3>
        {children}
        {footer && (
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Loading ───
export function Loading({ text = 'Ładowanie...' }) {
  return (
    <div style={{
      background: COLORS.bg, minHeight: '100vh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        fontFamily: FONT, color: COLORS.accent, fontSize: 14,
        animation: 'pulse 1.5s ease-in-out infinite',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        🎯 {text}
      </div>
    </div>
  );
}

// ─── Icons ───
export const Icons = {
  Plus: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>,
  Check: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8.5l3.5 3.5L13 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Trash: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 4h10M5 4V2.5A.5.5 0 015.5 2h3a.5.5 0 01.5.5V4m1.5 0l-.5 8a1 1 0 01-1 1h-5a1 1 0 01-1-1l-.5-8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Edit: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9.5 2.5l2 2L5 11H3V9l6.5-6.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Back: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Chev: () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  Reset: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 2v4h4M12 12V8H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M3.5 9A5 5 0 019.9 3.1M10.5 5A5 5 0 014.1 10.9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  Heat: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.5"/><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1" opacity="0.6"/><circle cx="8" cy="8" r="1" fill="currentColor"/></svg>,
  Target: () => <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.2"/><circle cx="7" cy="7" r="0.8" fill="currentColor"/></svg>,
  Users: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M1.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="11" cy="5.5" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M11 9.5c1.8 0 3.5 1.5 3.5 3.5" stroke="currentColor" strokeWidth="1.2"/></svg>,
  Trophy: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 2h8v4a4 4 0 01-8 0V2z" stroke="currentColor" strokeWidth="1.3"/><path d="M4 4H2.5a1 1 0 00-1 1v1a2 2 0 002 2H4M12 4h1.5a1 1 0 011 1v1a2 2 0 01-2 2H12M8 10v2M5 12h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>,
  DB: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><ellipse cx="8" cy="4" rx="5" ry="2" stroke="currentColor" strokeWidth="1.3"/><path d="M3 4v8c0 1.1 2.2 2 5 2s5-.9 5-2V4" stroke="currentColor" strokeWidth="1.3"/><path d="M3 8c0 1.1 2.2 2 5 2s5-.9 5-2" stroke="currentColor" strokeWidth="1.3"/></svg>,
  Image: () => <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><circle cx="5" cy="6" r="1.5" stroke="currentColor" strokeWidth="1"/><path d="M1.5 11l3-3 2 2 3-3 5 5" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/></svg>,
};
