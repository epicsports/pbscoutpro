/**
 * OpenTacticsAction — the ONE contextual door into the Coach Tactics board
 * (/layout/:layoutId/tactics). Same affordance everywhere (tournament view,
 * layout/Konfig, training, coach home/tab).
 *
 * Layout resolution:
 *   - explicit `layoutId` prop  → navigate straight there (tournament/training/Konfig).
 *   - no layoutId               → resolve from the workspace layouts:
 *       1 layout  → navigate directly,
 *       0 layouts → bounce to /layouts (nothing to open yet),
 *       N layouts → a lightweight picker, then navigate.
 * Tactics stay layout-sourced — NO per-tournament/-training duplication.
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Btn, Modal } from './ui';
import { useLayouts } from '../hooks/useFirestore';
import { useLanguage } from '../hooks/useLanguage';
import { COLORS, FONT, FONT_SIZE, RADIUS } from '../utils/theme';

export default function OpenTacticsAction({
  layoutId = null,
  label = null,
  variant = 'default',
  size = 'md',
  style,
  testId = 'open-tactics-action',
  // STAGE 2/3 — point the door at the new DrawingCanvas tactics editor. Default
  // false keeps the legacy board; flip to true (per-callsite now, globally at the
  // STAGE 3 supersede) to route into /tactics-canvas.
  newEngine = false,
}) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { layouts } = useLayouts();
  const [pickerOpen, setPickerOpen] = useState(false);

  const go = (id) => navigate(`/layout/${id}/${newEngine ? 'tactics-canvas' : 'tactics'}`);

  const onClick = () => {
    if (layoutId) { go(layoutId); return; }
    if (layouts.length === 1) { go(layouts[0].id); return; }
    if (layouts.length === 0) { navigate('/layouts'); return; }
    setPickerOpen(true);
  };

  return (
    <>
      <Btn variant={variant} size={size} testId={testId} onClick={onClick} style={style}>
        ✎ {label || t('tactics_board')}
      </Btn>
      <Modal open={pickerOpen} onClose={() => setPickerOpen(false)} title={t('open_tactics_pick_field')}>
        <div data-testid="open-tactics-picker" style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 360, overflowY: 'auto' }}>
          {layouts.map(l => (
            <div key={l.id} role="button" data-testid={`open-tactics-layout-${l.id}`}
              onClick={() => { setPickerOpen(false); go(l.id); }}
              style={{ minHeight: 52, display: 'flex', alignItems: 'center', padding: '8px 12px', cursor: 'pointer',
                background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.md,
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.text }}>
              {l.name || t('untitled_field')}
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
