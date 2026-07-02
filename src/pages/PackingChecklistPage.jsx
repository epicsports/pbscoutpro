// PackingChecklistPage — player packing checklist ("Checklista wyjazdowa").
// CC_BRIEF_PACKING_CHECKLIST Stage C. Faithful to the approved prototype.
// React state = source of truth (optimistic); catalog from src/data/packingChecklist.js.
// Persistence (Stage D) = users/{uid}/appState/packing, debounced, degrade-to-memory.
// theme.js tokens + ui.jsx primitives only — zero new hardcoded hex. No portrait lock.
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target, Shirt, Backpack, Droplets, Heart, Smartphone, Wallet, Package,
  Check, Plus, Minus, ChevronLeft, ChevronDown, RotateCcw, X, Shield, ShieldCheck, EyeOff, Eye,
} from 'lucide-react';
import { Btn, Input, ConfirmModal } from '../components/ui';
import { useLanguage } from '../hooks/useLanguage';
import { useWorkspace } from '../hooks/useWorkspace';
import * as ds from '../services/dataService';
import { COLORS, FONT, FONT_SIZE, SPACE, RADIUS, TOUCH } from '../utils/theme';
import { CATS, TEMPLATES, CATALOG_VERSION } from '../data/packingChecklist';

// Catalog `icon` string → lucide component (keeps the data file import-free).
const ICONS = { Target, Shirt, Backpack, Droplets, Heart, Smartphone, Wallet, Package };
const CRIT_TINT = 'rgba(245,158,11,0.07)'; // amber 7% — the one allowed rgba (critical row tint, per brief §4)

let _cid = 0;
const newCustomId = () => `custom_${Date.now()}_${_cid++}`;

export default function PackingChecklistPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useWorkspace();
  const uid = user?.uid || null;

  // ── State (source of truth) ──
  const [template, setTemplate] = useState('full');
  const [done, setDone] = useState({});          // { itemId: true }
  const [counts, setCounts] = useState({});       // { itemId: number }
  const [customItems, setCustomItems] = useState({}); // { catId: [{id,label}] }
  const [collapsed, setCollapsed] = useState({ /* gear+match open; rest closed (set on mount) */ });
  const [hideDone, setHideDone] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [addingCat, setAddingCat] = useState(null);   // catId mid-add
  const [addText, setAddText] = useState('');
  const [loaded, setLoaded] = useState(false);

  // Default collapse: gear + match expanded, rest collapsed.
  useEffect(() => {
    const init = {};
    CATS.forEach(c => { if (c.id !== 'gear' && c.id !== 'match') init[c.id] = true; });
    setCollapsed(init);
  }, []);

  // ── Stage D — read once on mount (degrade silently to in-memory) ──
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { setLoaded(true); return; }
      try {
        const d = await ds.getPackingState(uid);
        if (alive && d) {
          if (d.template) setTemplate(d.template);
          if (d.done) setDone(d.done);
          if (d.counts) setCounts(d.counts);
          if (d.customItems) setCustomItems(d.customItems);
          if (d.collapsed) setCollapsed(d.collapsed);
        }
      } catch (_) { /* persistence unavailable → in-memory only */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [uid]);

  // ── Stage D — debounced write (≈600ms) after any change; never breaks UI ──
  const writeTimer = useRef(null);
  useEffect(() => {
    if (!loaded || !uid) return undefined;
    clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(() => {
      ds.savePackingState(uid, { template, done, counts, customItems, collapsed, catalogVersion: CATALOG_VERSION })
        .catch(() => { /* degrade silently — React state is the source of truth */ });
    }, 600);
    return () => clearTimeout(writeTimer.current);
  }, [loaded, uid, template, done, counts, customItems, collapsed]);

  const activeTpl = useMemo(() => TEMPLATES.find(tp => tp.id === template) || TEMPLATES[0], [template]);

  // visible items per category for the active template (catalog + custom).
  const visibleByCat = useMemo(() => {
    const map = {};
    CATS.forEach(c => {
      const base = c.items.filter(it => activeTpl.max >= it.lvl);
      const custom = (customItems[c.id] || []).map(ci => ({ ...ci, lvl: 0, custom: true }));
      map[c.id] = [...base, ...custom];
    });
    return map;
  }, [activeTpl, customItems]);

  const isItemDone = useCallback((it) => (
    it.target ? (counts[it.id] || 0) >= it.target : !!done[it.id]
  ), [counts, done]);

  // progress over ALL visible items.
  const { packed, total } = useMemo(() => {
    let p = 0, tot = 0;
    CATS.forEach(c => visibleByCat[c.id].forEach(it => { tot++; if (isItemDone(it)) p++; }));
    return { packed: p, total: tot };
  }, [visibleByCat, isItemDone]);

  const pct = total ? packed / total : 0;

  // visible critical items still unpacked.
  const critMissing = useMemo(() => {
    const out = [];
    CATS.forEach(c => visibleByCat[c.id].forEach(it => { if (it.crit && !isItemDone(it)) out.push({ ...it, catName: c.name }); }));
    return out;
  }, [visibleByCat, isItemDone]);
  const critAll = useMemo(() => {
    const out = [];
    CATS.forEach(c => visibleByCat[c.id].forEach(it => { if (it.crit) out.push({ ...it, catName: c.name }); }));
    return out;
  }, [visibleByCat]);

  // ── Mutators ──
  const toggleBinary = (id) => setDone(prev => ({ ...prev, [id]: !prev[id] }));
  const setCount = (id, target, v) => setCounts(prev => ({ ...prev, [id]: Math.max(0, Math.min(target, v)) }));
  const toggleCounted = (id, target) => setCounts(prev => ({ ...prev, [id]: (prev[id] || 0) >= target ? 0 : target }));
  const toggleCollapse = (catId) => setCollapsed(prev => ({ ...prev, [catId]: !prev[catId] }));
  const commitAdd = (catId) => {
    const label = addText.trim();
    if (!label) { setAddingCat(null); setAddText(''); return; }
    setCustomItems(prev => ({ ...prev, [catId]: [...(prev[catId] || []), { id: newCustomId(), label }] }));
    setAddText(''); setAddingCat(null);
  };
  const removeCustom = (catId, id) => {
    setCustomItems(prev => ({ ...prev, [catId]: (prev[catId] || []).filter(ci => ci.id !== id) }));
    setDone(prev => { const n = { ...prev }; delete n[id]; return n; });
  };
  const doReset = () => { setDone({}); setCounts({}); setResetOpen(false); };

  const allDone = total > 0 && packed === total;

  // ── Progress ring (SVG) ──
  const R = 16, C = 2 * Math.PI * R;
  const ring = (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ flexShrink: 0 }} aria-hidden>
      <circle cx="22" cy="22" r={R} fill="none" stroke={COLORS.border} strokeWidth="4" />
      <circle cx="22" cy="22" r={R} fill="none" stroke={allDone ? COLORS.success : COLORS.accent} strokeWidth="4"
        strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)}
        transform="rotate(-90 22 22)" style={{ transition: 'stroke-dashoffset .4s ease, stroke .2s' }} />
      {allDone
        ? <g transform="translate(14 14)"><path d="M2 8 L6 12 L14 3" fill="none" stroke={COLORS.success} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></g>
        : <text x="22" y="26" textAnchor="middle" fontFamily={FONT} fontSize={FONT_SIZE.xs} fontWeight="800" fill={COLORS.text}>{Math.round(pct * 100)}</text>}
    </svg>
  );

  // ── Checkbox glyph ──
  const Checkbox = ({ checked, onClick, label }) => (
    <div role="checkbox" aria-checked={checked} aria-label={label} onClick={onClick}
      style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', flexShrink: 0 }}>
      <span style={{
        width: 24, height: 24, borderRadius: RADIUS.sm, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: checked ? COLORS.accent : 'transparent', border: `2px solid ${checked ? COLORS.accent : COLORS.border}`, transition: 'all .12s',
      }}>{checked && <Check size={16} strokeWidth={3} color={COLORS.bg} />}</span>
    </div>
  );

  const rowLabel = (it, isDone) => (
    <span style={{ flex: 1, minWidth: 0, fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 500,
      color: isDone ? COLORS.textMuted : COLORS.text, textDecoration: isDone ? 'line-through' : 'none',
      display: 'flex', alignItems: 'center', gap: SPACE.sm }}>
      {it.label}
      {it.crit && <Shield size={13} color={COLORS.accent} style={{ flexShrink: 0 }} aria-hidden />}
    </span>
  );

  return (
    <div style={{ minHeight: '100dvh', background: COLORS.bg, display: 'flex', flexDirection: 'column' }}>
      {/* ── Header (sticky) ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: COLORS.bg, borderBottom: `1px solid ${COLORS.border}` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: `${SPACE.md}px ${SPACE.lg}px`, display: 'flex', alignItems: 'center', gap: SPACE.md }}>
          <div role="button" aria-label={t('back')} data-testid="packing-back" onClick={() => navigate('/')}
            style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', cursor: 'pointer', color: COLORS.accent, marginLeft: -8 }}>
            <ChevronLeft size={24} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, fontWeight: 700, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 0.6 }}>{t('packing_eyebrow')}</div>
            <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.text }}>{t('packing_title')}</div>
            <div data-testid="packing-progress-sub" style={{ fontFamily: FONT, fontSize: FONT_SIZE.xs, color: COLORS.textDim, marginTop: 2 }}>
              {t('packing_progress_sub', packed, total, activeTpl.label)}
            </div>
          </div>
          {ring}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <div style={{ maxWidth: 520, margin: '0 auto', padding: SPACE.lg, paddingBottom: 96, display: 'flex', flexDirection: 'column', gap: SPACE.md }}>

          {/* ── Template chips ── */}
          <div style={{ display: 'flex', gap: SPACE.sm, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 2 }}>
            {TEMPLATES.map(tp => {
              const active = template === tp.id;
              return (
                <div key={tp.id} role="button" data-testid={`packing-tpl-${tp.id}`} onClick={() => setTemplate(tp.id)}
                  style={{ flex: '0 0 auto', minWidth: 130, padding: `${SPACE.sm}px ${SPACE.md}px`, borderRadius: RADIUS.md, cursor: 'pointer',
                    background: active ? CRIT_TINT : COLORS.surfaceLight, border: `1.5px solid ${active ? COLORS.accent : COLORS.border}`, WebkitTapHighlightColor: 'transparent' }}>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: active ? COLORS.accent : COLORS.text }}>{tp.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted, marginTop: 2 }}>{tp.sub}</div>
                </div>
              );
            })}
          </div>

          {/* ── Controls row ── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div role="button" data-testid="packing-hide-toggle" onClick={() => setHideDone(v => !v)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.xs, minHeight: TOUCH.minTarget, padding: `0 ${SPACE.sm}px`, cursor: 'pointer',
                fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600, color: COLORS.textDim, WebkitTapHighlightColor: 'transparent' }}>
              {hideDone ? <Eye size={16} /> : <EyeOff size={16} />}
              {hideDone ? t('packing_show_done') : t('packing_hide_done')}
            </div>
          </div>

          {/* ── Category cards ── */}
          {CATS.map(c => {
            const items = visibleByCat[c.id];
            const shown = hideDone ? items.filter(it => !isItemDone(it)) : items;
            if (items.length === 0) return null;
            if (hideDone && shown.length === 0) return null; // whole card hidden when nothing left
            const catPacked = items.filter(isItemDone).length;
            const catTotal = items.length;
            const catComplete = catTotal > 0 && catPacked === catTotal;
            const open = !collapsed[c.id];
            const Icon = ICONS[c.icon] || Package;
            return (
              <div key={c.id} data-testid={`packing-cat-${c.id}`} style={{ background: COLORS.surfaceLight, border: `1px solid ${COLORS.border}`, borderRadius: RADIUS.lg, overflow: 'hidden' }}>
                <div role="button" data-testid={`packing-cat-head-${c.id}`} onClick={() => toggleCollapse(c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: SPACE.md, minHeight: TOUCH.minTarget, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                  <span style={{ width: 32, height: 32, borderRadius: RADIUS.sm, background: COLORS.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: catComplete ? COLORS.success : COLORS.accent }}>
                    <Icon size={18} />
                  </span>
                  <span style={{ flex: 1, fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 700, color: COLORS.text }}>{c.name}</span>
                  {catComplete
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: `2px ${SPACE.sm}px`, borderRadius: RADIUS.xl, background: `${COLORS.success}1f`, color: COLORS.success, fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 700 }}><Check size={13} strokeWidth={3} />{t('packing_complete')}</span>
                    : <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: COLORS.textDim }}>{catPacked} / {catTotal}</span>}
                  <ChevronDown size={18} color={COLORS.textMuted} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s', flexShrink: 0 }} />
                </div>
                {/* progress sliver */}
                <div style={{ height: 2, background: COLORS.border }}>
                  <div style={{ height: '100%', width: `${catTotal ? (catPacked / catTotal) * 100 : 0}%`, background: catComplete ? COLORS.success : COLORS.accent, transition: 'width .3s' }} />
                </div>
                {open && (
                  <div>
                    {shown.map(it => {
                      const isDone = isItemDone(it);
                      return (
                        <div key={it.id} data-testid={`packing-row-${it.id}`}
                          style={{ display: 'flex', alignItems: 'center', gap: SPACE.xs, padding: `0 ${SPACE.md}px`, minHeight: 54,
                            borderTop: `1px solid ${COLORS.border}`,
                            borderLeft: it.crit ? `3px solid ${COLORS.accent}` : '3px solid transparent',
                            background: it.crit && !isDone ? CRIT_TINT : 'transparent' }}>
                          <Checkbox checked={isDone} label={it.label}
                            onClick={() => (it.target ? toggleCounted(it.id, it.target) : toggleBinary(it.id))} />
                          {rowLabel(it, isDone)}
                          {it.target ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                              <div role="button" aria-label="−" data-testid={`packing-dec-${it.id}`} onClick={() => setCount(it.id, it.target, (counts[it.id] || 0) - 1)}
                                style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textDim }}><Minus size={16} /></div>
                              <span style={{ minWidth: 44, textAlign: 'center', fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: isDone ? COLORS.success : COLORS.text }}>{counts[it.id] || 0} / {it.target}</span>
                              <div role="button" aria-label="+" data-testid={`packing-inc-${it.id}`} onClick={() => setCount(it.id, it.target, (counts[it.id] || 0) + 1)}
                                style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textDim }}><Plus size={16} /></div>
                            </div>
                          ) : it.custom ? (
                            <div role="button" aria-label={t('remove')} data-testid={`packing-rm-${it.id}`} onClick={() => removeCustom(c.id, it.id)}
                              style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted, flexShrink: 0 }}><X size={16} /></div>
                          ) : null}
                        </div>
                      );
                    })}
                    {/* add row */}
                    <div style={{ borderTop: `1px solid ${COLORS.border}`, padding: SPACE.sm }}>
                      {addingCat === c.id ? (
                        <div style={{ display: 'flex', gap: SPACE.sm, alignItems: 'center' }}>
                          <Input value={addText} onChange={setAddText} placeholder={t('packing_add_ph')} autoFocus
                            onKeyDown={(e) => { if (e.key === 'Enter') commitAdd(c.id); if (e.key === 'Escape') { setAddingCat(null); setAddText(''); } }} />
                          <Btn variant="accent" size="sm" onClick={() => commitAdd(c.id)}>{t('packing_add_btn')}</Btn>
                        </div>
                      ) : (
                        <div role="button" data-testid={`packing-add-${c.id}`} onClick={() => { setAddingCat(c.id); setAddText(''); }}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: SPACE.xs, minHeight: TOUCH.minTarget, padding: `0 ${SPACE.sm}px`, cursor: 'pointer', color: COLORS.textDim, fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 600 }}>
                          <Plus size={16} />{t('packing_add_item')}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* ── All-done banner ── */}
          {allDone && (
            <div data-testid="packing-alldone" style={{ background: `${COLORS.success}14`, border: `1px solid ${COLORS.success}40`, borderRadius: RADIUS.lg, padding: SPACE.lg, textAlign: 'center' }}>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.success }}>{t('packing_alldone_title')}</div>
              <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 2 }}>{t('packing_alldone_sub')}</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom bar (sticky) ── */}
      <div style={{ position: 'sticky', bottom: 0, zIndex: 10, background: COLORS.bg, borderTop: `1px solid ${COLORS.border}`, padding: `${SPACE.sm}px ${SPACE.lg}px calc(${SPACE.sm}px + env(safe-area-inset-bottom, 0px))` }}>
        <div style={{ maxWidth: 520, margin: '0 auto', display: 'flex', gap: SPACE.sm, alignItems: 'stretch' }}>
          <Btn variant={critMissing.length > 0 ? 'accent' : 'default'} testId="packing-crit-btn" onClick={() => setSheetOpen(true)}
            style={{ flex: 1, justifyContent: 'center', gap: SPACE.sm, ...(critMissing.length === 0 ? { color: COLORS.success, borderColor: COLORS.success } : {}) }}>
            {critMissing.length === 0 ? <ShieldCheck size={18} /> : <Shield size={18} />}
            {t('packing_check_crit')}
            {critMissing.length > 0 && <span data-testid="packing-crit-badge" style={{ minWidth: 22, padding: '0 6px', borderRadius: RADIUS.xl, background: COLORS.bg, color: COLORS.accent, fontFamily: FONT, fontSize: FONT_SIZE.xs, fontWeight: 800, lineHeight: '20px' }}>{critMissing.length}</span>}
          </Btn>
          <Btn variant="default" ariaLabel={t('reset')} testId="packing-reset-btn" onClick={() => setResetOpen(true)} style={{ flexShrink: 0 }}><RotateCcw size={18} /></Btn>
        </div>
      </div>

      {/* ── Critical sheet ── */}
      {sheetOpen && (
        <>
          <div onClick={() => setSheetOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 80 }} />
          <div data-testid="packing-sheet" style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 81, background: COLORS.surfaceLight, borderTop: `1px solid ${COLORS.border}`, borderRadius: `${RADIUS.xl}px ${RADIUS.xl}px 0 0`, maxHeight: '85vh', display: 'flex', flexDirection: 'column', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: SPACE.md, padding: SPACE.lg, borderBottom: `1px solid ${COLORS.border}` }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.text }}>{t('packing_sheet_title')}</div>
                <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 2 }}>{t('packing_sheet_sub')}</div>
              </div>
              <div role="button" aria-label={t('packing_sheet_close')} data-testid="packing-sheet-close" onClick={() => setSheetOpen(false)}
                style={{ minWidth: TOUCH.minTarget, minHeight: TOUCH.minTarget, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: COLORS.textMuted }}><X size={22} /></div>
            </div>
            <div style={{ overflowY: 'auto', padding: `${SPACE.sm}px ${SPACE.lg}px ${SPACE.lg}px` }}>
              {critMissing.length === 0 ? (
                <div data-testid="packing-sheet-success" style={{ textAlign: 'center', padding: `${SPACE.xl}px 0` }}>
                  <ShieldCheck size={48} color={COLORS.success} />
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 800, color: COLORS.success, marginTop: SPACE.md }}>{t('packing_sheet_ok_title')}</div>
                  <div style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, color: COLORS.textDim, marginTop: 2 }}>{t('packing_sheet_ok_sub')}</div>
                </div>
              ) : (
                critAll.map(it => {
                  const isDone = isItemDone(it);
                  return (
                    <div key={it.id} data-testid={`packing-sheet-row-${it.id}`} style={{ display: 'flex', alignItems: 'center', gap: SPACE.sm, minHeight: 54, borderBottom: `1px solid ${COLORS.border}` }}>
                      <Checkbox checked={isDone} label={it.label} onClick={() => (it.target ? toggleCounted(it.id, it.target) : toggleBinary(it.id))} />
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontFamily: FONT, fontSize: FONT_SIZE.base, fontWeight: 600, color: isDone ? COLORS.textMuted : COLORS.text, textDecoration: isDone ? 'line-through' : 'none' }}>{it.label}</span>
                        <span style={{ display: 'block', fontFamily: FONT, fontSize: FONT_SIZE.xxs, color: COLORS.textMuted }}>{it.catName}</span>
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}

      <ConfirmModal open={resetOpen} onClose={() => setResetOpen(false)}
        title={t('packing_reset_title')} message={t('packing_reset_msg')}
        confirmLabel={t('packing_reset_confirm')} onConfirm={doReset} danger />
    </div>
  );
}
