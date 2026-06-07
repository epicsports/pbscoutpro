import React, { useMemo, useState } from 'react';
import { Skull, X } from 'lucide-react';
import { Btn } from '../ui';
import { useLanguage } from '../../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS, SPACE, TOUCH } from '../../utils/theme';
import { resolveZones } from '../../utils/layoutZones';
import ZoneTapField from './ZoneTapField';

/**
 * ZoneShotDrawer — § zone-shot capture (Pattern B), self-log adapter.
 *
 * Maximized drawer (fixed header + fixed Save, both always visible). The field
 * itself is the shared `ZoneTapField` (viewportSide='right' — zones are authored
 * on the field's right side and self-log is always a right-half view). The
 * player taps zones they fired at (pure select on the dense field) and marks a
 * binary `kill` per selected zone on roomy ≥44px chips below (§27: kill is an
 * interactive control → off the cramped field onto a proper target).
 *
 * Writes `shots:[{zoneId, kill}]` (the data layer dual-reads this vs legacy
 * {bunker} shots — §109 STAGE 0). Scouting reuses `ZoneTapField` with no kills
 * + full field (zone-attribution W2).
 */
export default function ZoneShotDrawer({ open, layout, fieldImage, initial = [], onSave, onClose }) {
  const { t } = useLanguage();

  const zones = useMemo(
    () => resolveZones(layout).filter(z => Array.isArray(z?.polygon) && z.polygon.length >= 3),
    [layout],
  );

  // selection: Map<zoneId, kill:boolean>. Seeded on mount from `initial` (the
  // parent conditionally mounts the drawer, so a fresh open re-seeds).
  const [sel, setSel] = useState(
    () => new Map((initial || []).filter(s => s?.zoneId).map(s => [s.zoneId, !!s.kill])),
  );

  const toggleZone = (id) => setSel(prev => {
    const next = new Map(prev);
    if (next.has(id)) next.delete(id); else next.set(id, false);
    return next;
  });
  const toggleKill = (id) => setSel(prev => {
    const next = new Map(prev);
    if (next.has(id)) next.set(id, !next.get(id));
    return next;
  });

  const selectedList = zones.filter(z => sel.has(z.id));
  const handleSave = () => {
    onSave(selectedList.map(z => ({ zoneId: z.id, kill: !!sel.get(z.id) })));
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 60,
      background: COLORS.bg, display: 'flex', flexDirection: 'column',
    }}>
      {/* Fixed header */}
      <div style={{
        flexShrink: 0, height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: `0 ${SPACE.md}px`,
        background: COLORS.surfaceDark, borderBottom: `1px solid ${COLORS.border}`,
      }}>
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.md, fontWeight: 700, color: COLORS.text }}>
          {t('ppt_zone_drawer_title')}
        </span>
        <div onClick={onClose} role="button" aria-label="Close" style={{
          minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: COLORS.textMuted, WebkitTapHighlightColor: 'transparent',
        }}>
          <X size={22} />
        </div>
      </div>

      {/* Scrollable body — field + kill chips */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: SPACE.lg,
        display: 'flex', flexDirection: 'column', gap: SPACE.md,
      }}>
        <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 500, color: COLORS.textMuted }}>
          {t('ppt_zone_drawer_hint')}
        </div>

        {zones.length === 0 ? (
          <div style={{
            padding: SPACE.xl, textAlign: 'center', fontStyle: 'italic',
            fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted,
          }}>
            {t('ppt_zone_none')}
          </div>
        ) : (
          <ZoneTapField
            fieldImage={fieldImage}
            zones={zones}
            selectedIds={selectedList.map(z => z.id)}
            viewportSide="right"
            onToggleZone={toggleZone}
          />
        )}
      </div>

      {/* Fixed bottom — kill chips (sticky) + Save. The chips live HERE, OUT of
          the scrollable body, so they never hide under the fold when the field
          is tall: always reachable above Zapisz. Scroll-capped so many selected
          zones don't push Save off-screen. */}
      <div style={{ flexShrink: 0, borderTop: `1px solid ${COLORS.border}`, background: COLORS.bg }}>
        {selectedList.length > 0 && (
          <div style={{ padding: `${SPACE.md}px ${SPACE.lg}px 0`, maxHeight: '34vh', overflowY: 'auto' }}>
            <div style={{
              fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: 0.5, color: COLORS.textDim,
              marginBottom: SPACE.sm,
            }}>
              {t('ppt_zone_kill_hint')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: SPACE.sm }}>
              {selectedList.map(z => {
                const kill = !!sel.get(z.id);
                return (
                  <div key={z.id} style={{
                    display: 'flex', alignItems: 'center', gap: SPACE.sm,
                    minHeight: TOUCH.minTarget, paddingLeft: 12,
                    background: COLORS.surfaceLight, borderRadius: RADIUS.lg,
                    border: `1px solid ${kill ? COLORS.danger : (z.color || COLORS.border)}`,
                  }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: 4,
                      background: z.color || COLORS.textMuted, flexShrink: 0,
                    }} />
                    <span style={{
                      fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600,
                      color: COLORS.text, whiteSpace: 'nowrap',
                    }}>
                      {z.name}
                    </span>
                    <button
                      onClick={() => toggleKill(z.id)}
                      aria-pressed={kill}
                      aria-label={`kill ${z.name}`}
                      style={{
                        minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: 'none', background: 'transparent', cursor: 'pointer',
                        borderRadius: RADIUS.md, WebkitTapHighlightColor: 'transparent',
                      }}
                    >
                      <Skull size={20} color={kill ? COLORS.danger : COLORS.textDim}
                        fill={kill ? COLORS.danger : 'none'} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div style={{
          padding: SPACE.lg,
          paddingBottom: `calc(${SPACE.lg}px + env(safe-area-inset-bottom, 0px))`,
        }}>
          <Btn variant="accent" onClick={handleSave}
            style={{ width: '100%', minHeight: 56, fontSize: 17, fontWeight: 800 }}>
            {t('ppt_zone_save')}{selectedList.length > 0 ? ` (${selectedList.length})` : ''}
          </Btn>
        </div>
      </div>
    </div>
  );
}
