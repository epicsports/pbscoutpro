/**
 * TacticsCanvasPage — Coach "Taktyki" on the new DrawingCanvas engine (STAGE 2).
 * Route: /layout/:layoutId/tactics-canvas  (ADDITIVE — the legacy
 * /layout/:layoutId/tactics board is untouched until the STAGE 3 supersede.)
 *
 * Rail = tactic list (tap = select · trash = delete · + Nowa taktyka). Main =
 * DrawingCanvas of the selected tactic, on the real layout field image +
 * base-calibration. Persists the engine's typed elements[] to an ADDITIVE
 * `tacticalElements` field on the existing tactic doc via updateLayoutTactic —
 * the legacy players/shots/freehandStrokes fields are never touched, so the old
 * tactics surfaces keep working.
 */
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, Trash2, ChevronLeft } from 'lucide-react';

import DrawingCanvas from '../components/tactical/DrawingCanvas';
import PageHeader from '../components/PageHeader';
import { EmptyState, ConfirmModal } from '../components/ui';
import { useLayouts, useLayoutTactics } from '../hooks/useFirestore';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, RADIUS, ELEV, TOUCH } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

export default function TacticsCanvasPage() {
  const { layoutId } = useParams();
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const tx = (pl, en) => (lang === 'en' ? en : pl);

  const { layouts } = useLayouts();
  const layout = layouts.find((l) => l.id === layoutId);
  const { tactics, loading } = useLayoutTactics(layoutId);

  const [selectedId, setSelectedId] = useState(null);
  const [confirmDelId, setConfirmDelId] = useState(null);

  const sorted = useMemo(() => [...(tactics || [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)), [tactics]);
  useEffect(() => {
    if (selectedId && sorted.some((t) => t.id === selectedId)) return;
    setSelectedId(sorted[0]?.id || null);
  }, [sorted, selectedId]);
  const selected = sorted.find((t) => t.id === selectedId) || null;

  const base = layout?.fieldCalibration?.homeBase || { x: 0.05, y: 0.5 };

  const addTactic = async () => {
    const ref = await ds.addLayoutTactic(layoutId, { name: tx('Nowa taktyka', 'New tactic') });
    if (ref?.id) setSelectedId(ref.id);
  };
  const saveElements = async (els) => {
    if (!selectedId) return;
    await ds.updateLayoutTactic(layoutId, selectedId, { tacticalElements: els });
  };
  const doDelete = async () => {
    const id = confirmDelId; setConfirmDelId(null);
    if (id) await ds.deleteLayoutTactic(layoutId, id);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      <PageHeader title={tx('Taktyki', 'Tactics')} subtitle={layout?.name || ''} back={{ to: () => navigate(-1) }} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        {/* rail */}
        <div style={{ width: 244, flexShrink: 0, borderRight: `1px solid ${ELEV.hairline}`, background: ELEV.surface, display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {loading && <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textMuted, padding: 8 }}>{tx('Ładowanie…', 'Loading…')}</div>}
            {!loading && sorted.length === 0 && (
              <EmptyState text={tx('Brak taktyk', 'No tactics')} subtitle={tx('Dodaj pierwszą taktykę.', 'Add your first tactic.')} />
            )}
            {sorted.map((tac) => {
              const on = tac.id === selectedId;
              const count = Array.isArray(tac.tacticalElements) ? tac.tacticalElements.length : 0;
              return (
                <div key={tac.id} onClick={() => setSelectedId(tac.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 10px', borderRadius: RADIUS.md, cursor: 'pointer',
                    background: on ? ELEV.raised : 'transparent', border: `1px solid ${on ? ELEV.hairlineStrong : 'transparent'}` }}>
                  <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: on ? 800 : 600, color: on ? COLORS.text : COLORS.textDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tac.name || tx('Taktyka', 'Tactic')}</span>
                  {count > 0 && <span style={{ fontFamily: FONT, fontSize: 11, color: COLORS.textMuted }}>{count}</span>}
                  <div role="button" aria-label={tx('Usuń', 'Delete')} onClick={(e) => { e.stopPropagation(); setConfirmDelId(tac.id); }}
                    style={{ width: 30, height: 30, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, color: COLORS.textMuted, cursor: 'pointer' }}>
                    <Trash2 size={15} />
                  </div>
                </div>
              );
            })}
          </div>
          <div
            role="button" aria-label={tx('Nowa taktyka', 'New tactic')} onClick={addTactic}
            style={{ flexShrink: 0, margin: 10, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              borderRadius: RADIUS.lg, background: COLORS.accentGradient || COLORS.accent, color: '#0a0e17', cursor: 'pointer',
              fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 800 }}>
            <Plus size={18} /> {tx('Nowa taktyka', 'New tactic')}
          </div>
        </div>

        {/* main = engine */}
        <div style={{ flex: 1, minWidth: 0, minHeight: 0 }}>
          {selected ? (
            <DrawingCanvas
              key={selected.id}
              fieldImage={layout?.fieldImage}
              base={base}
              seed={Array.isArray(selected.tacticalElements) ? selected.tacticalElements : []}
              onSave={saveElements}
            />
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmptyState text={tx('Wybierz taktykę', 'Select a tactic')} subtitle={tx('albo dodaj nową.', 'or add a new one.')} />
            </div>
          )}
        </div>
      </div>

      {confirmDelId && (
        <ConfirmModal
          open
          title={tx('Usunąć taktykę?', 'Delete tactic?')}
          message={tx('Taktyka i jej rysunek zostaną trwale usunięte.', 'The tactic and its drawing will be permanently deleted.')}
          confirmLabel={tx('Usuń', 'Delete')}
          danger
          onConfirm={doDelete}
          onClose={() => setConfirmDelId(null)}
        />
      )}
    </div>
  );
}
