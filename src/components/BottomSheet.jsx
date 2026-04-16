import { COLORS, RADIUS, SPACE } from '../utils/theme';

/**
 * BottomSheet — slide-up overlay with backdrop.
 * maxHeight: string (default '50vh')
 */
export default function BottomSheet({ open, onClose, maxHeight = '50vh', children }) {
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
        borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, padding: `${SPACE.sm}px ${SPACE.lg}px ${SPACE.lg}px`,
        paddingBottom: `calc(${SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
        zIndex: 91, animation: 'slideUp 0.2s ease-out',
        maxHeight, overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: `${SPACE.xs}px 0 ${SPACE.sm}px` }}>
          <div style={{ width: 36, height: SPACE.xs, borderRadius: 2, background: COLORS.border }} />
        </div>
        {children}
      </div>
    </>
  );
}
