/**
 * LayoutsPage — grid of the workspace's layout cards (§ 96: merged base ∪
 * overlay) + a "Browse library" flow to add a global base layout to the
 * workspace (creates an overlay). "New layout" (authoring a new base) is
 * super_admin-only — coaches consume the shared library, never edit base.
 *
 * Wide (≥720px viewport): renders LayoutsListWide — a full-bleed auto-fill grid
 * of field-thumbnail cards with a sticky search + dynamic league chips + count.
 * Phone (<720px): the existing 2-col card grid, UNCHANGED (additive dispatch).
 */
import { useState, useMemo } from 'react';
import { useDevice } from '../hooks/useDevice';
import { useNavigate } from 'react-router-dom';

import PageHeader from '../components/PageHeader';
import Screen from '../components/Screen';
import RdIcon from '../components/RdIcon';
import { Btn, SectionTitle, EmptyState, SkeletonList, Modal, Icons, LeagueBadge, YearBadge } from '../components/ui';
import { useLayouts, useBaseLayouts } from '../hooks/useFirestore';
import { useIsSuperAdmin } from '../hooks/useIsSuperAdmin';
import { useViewAs } from '../hooks/useViewAs';
import { canEditTactics } from '../utils/roleUtils';
import * as ds from '../services/dataService';
import { COLORS, ELEV, FONT, FONT_SIZE, TYPE, TRACKING, TNUM, TOUCH, RADIUS, LEAGUE_COLORS, SPACE, responsive } from '../utils/theme';
import { useLanguage } from '../hooks/useLanguage';

export default function LayoutsPage() {
  const { t } = useLanguage();
  const device = useDevice();
  const R = responsive(device.type);
  const navigate = useNavigate();
  const { layouts, loading } = useLayouts();
  const { bases, loading: basesLoading } = useBaseLayouts();
  const isSuper = useIsSuperAdmin();
  // Playbooks framing (CC_BRIEF_PLAYBOOKS): a coach (canEditTactics, not admin) sees
  // the SAME library framed as "playbooks to plan on", not admin "layout config".
  // Uses effectiveRoles/effectiveIsAdmin so view-as=coach shows the coach framing.
  const { effectiveRoles, effectiveIsAdmin } = useViewAs();
  const coachView = !effectiveIsAdmin && canEditTactics(effectiveRoles);

  const [libraryOpen, setLibraryOpen] = useState(false);
  const [adding, setAdding] = useState(null);   // baseId mid-add

  const addedIds = new Set(layouts.map(l => l.id));
  const available = bases.filter(b => !addedIds.has(b.id));

  const handleAdd = async (base) => {
    setAdding(base.id);
    try {
      await ds.addLayoutToWorkspace(base.id, { nameOverride: null });
    } finally {
      setAdding(null);
    }
  };

  // ── Wide dispatch (≥720) — full-bleed grid variant; phone path untouched ──
  const wide = device.width >= 720;

  const headerTitle = coachView ? t('playbooks_title') : t('layouts_label');
  const headerSubtitle = coachView ? t('playbooks_subtitle') : t('layouts_subtitle');

  return (
    <Screen archetype="list" padBottom={false} style={{ display: 'flex', flexDirection: 'column' }}
      header={<PageHeader back={{ to: '/' }}
        title={headerTitle}
        subtitle={headerSubtitle} />}>

      {wide ? (
        <LayoutsListWide
          t={t}
          loading={loading}
          layouts={layouts}
          isSuper={isSuper}
          onOpen={(id) => navigate(`/layout/${id}`)}
          onBrowse={() => setLibraryOpen(true)}
          onNew={() => navigate('/layout/new')}
        />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: R.layout.padding, paddingBottom: 64, display: 'flex', flexDirection: 'column', gap: R.layout.gap }}>

          <SectionTitle>
            {t('layouts_count_title', layouts.length)}
          </SectionTitle>

          {loading && <SkeletonList count={3} />}
          {!loading && !layouts.length && (
            <EmptyState icon="🗺️" text={t('layouts_empty_add_first')} />
          )}

          {/* 2x2 grid, sorted by year desc then name */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 10,
          }}>
            {[...layouts]
              .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
              .map(l => (
              <div
                key={l.id}
                onClick={() => navigate(`/layout/${l.id}`)}
                style={{
                  background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                }}
              >
                {l.fieldImage && (
                  <div style={{ position: 'relative', overflow: 'hidden', aspectRatio: '4/3' }}>
                    <img src={l.fieldImage} alt={l.name} loading="lazy"
                      style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                  </div>
                )}
                <div style={{ padding: '8px 10px' }}>
                  <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: TOUCH.fontSm, color: COLORS.text,
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {l.name}
                  </div>
                  <div style={{ fontFamily: FONT, fontSize: TOUCH.fontXs, color: COLORS.textDim, marginTop: 2,
                    display: 'flex', alignItems: 'center', gap: 4 }}>
                    <LeagueBadge league={l.league} /> <YearBadge year={l.year} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Browse the shared library — add an existing field to this workspace */}
          <Btn variant="accent" onClick={() => setLibraryOpen(true)} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            <Icons.Plus /> {t('layouts_browse_library')}
          </Btn>

          {/* Authoring a new base layout is super_admin-only (§ 96) */}
          {isSuper && (
            <Btn variant="default" onClick={() => navigate('/layout/new')} style={{ width: '100%', justifyContent: 'center' }}>
              <Icons.Plus /> {t('layouts_new_base')}
            </Btn>
          )}
        </div>
      )}

      {/* ═══ LIBRARY MODAL — add a global base to this workspace ═══ */}
      <Modal open={libraryOpen} onClose={() => setLibraryOpen(false)} title={t('layouts_library_title')} maxWidth={520}>
        {basesLoading && <SkeletonList count={3} />}
        {!basesLoading && !available.length && (
          <EmptyState icon="✓" text={bases.length ? t('layouts_library_all_added') : t('layouts_library_empty')} />
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {available
            .sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || ''))
            .map(base => (
            <div key={base.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              background: COLORS.surfaceDark, border: `1px solid ${COLORS.border}`,
              borderRadius: 10, padding: 8, minHeight: TOUCH.minTarget,
            }}>
              {base.fieldImage
                ? <img src={base.fieldImage} alt={base.name} loading="lazy"
                    style={{ width: 56, height: 42, borderRadius: 6, objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 56, height: 42, borderRadius: 6, background: COLORS.bg, flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: FONT_SIZE.sm, color: COLORS.text,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {base.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                  <LeagueBadge league={base.league} /> <YearBadge year={base.year} />
                </div>
              </div>
              <Btn variant="accent" size="sm" disabled={adding === base.id}
                onClick={() => handleAdd(base)}>
                {adding === base.id ? '…' : t('add')}
              </Btn>
            </div>
          ))}
        </div>
      </Modal>
    </Screen>
  );
}

// ════════════════════════════════════════════════════════════════════════════
// LayoutsListWide — full-bleed auto-fill grid of field-thumbnail cards with a
// sticky search bar + dynamic league chips + live count + empty state. Wired to
// the page's REAL layouts; no mock data. Ported (look) from prototype
// redesign8.jsx:404 → our theme tokens (COLORS/ELEV/FONT/RADIUS), RdIcon, no emoji.
// ════════════════════════════════════════════════════════════════════════════
function LayoutsListWide({ t, loading, layouts, isSuper, onOpen, onBrowse, onNew }) {
  const [q, setQ] = useState('');
  const [lg, setLg] = useState('all');

  // Dynamic league chips from the REAL data (year-desc base sort, then name).
  const sorted = useMemo(() =>
    [...layouts].sort((a, b) => (b.year || 0) - (a.year || 0) || (a.name || '').localeCompare(b.name || '')),
    [layouts]);

  const leagues = useMemo(() =>
    [...new Set(sorted.map(l => l.league).filter(Boolean))],
    [sorted]);

  // Reset the league filter if its league disappears from the data.
  const lgActive = lg === 'all' || leagues.includes(lg) ? lg : 'all';

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return sorted.filter(l => {
      const okText = !s
        || (l.name || '').toLowerCase().includes(s)
        || String(l.year || '').includes(s)
        || (l.league || '').toLowerCase().includes(s);
      const okLg = lgActive === 'all' || l.league === lgActive;
      return okText && okLg;
    });
  }, [sorted, q, lgActive]);

  const countLabel = t('layouts_count_title', list.length);

  const Chip = ({ id, label }) => {
    const on = lgActive === id;
    return (
      <button
        type="button"
        onClick={() => setLg(id)}
        style={{
          flexShrink: 0, minHeight: TOUCH.minTarget, padding: '7px 16px',
          borderRadius: RADIUS.full, cursor: 'pointer',
          fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 800, letterSpacing: '.2px',
          color: on ? COLORS.black : COLORS.textDim,
          background: on ? COLORS.accent : ELEV.sunken,
          border: `1px solid ${on ? COLORS.accent : ELEV.hairline}`,
          transition: 'background .12s, color .12s, border-color .12s',
        }}
      >{label}</button>
    );
  };

  return (
    <div style={{ flex: 1, height: '100%', overflowY: 'auto', background: ELEV.bg, fontFamily: FONT }}>
      {/* ── sticky toolbar: search + league chips + new + count ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
        padding: '14px 28px', borderBottom: `1px solid ${ELEV.hairline}`,
        background: `${ELEV.bg}f2`, backdropFilter: 'blur(8px)',
      }}>
        {/* search */}
        <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 220, maxWidth: 420 }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: COLORS.textMuted, display: 'flex', pointerEvents: 'none' }}>
            <RdIcon name="compass" size={15} />
          </span>
          <input
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder={t('layouts_search_ph')}
            style={{
              width: '100%', boxSizing: 'border-box', minHeight: TOUCH.minTarget,
              padding: '10px 12px 10px 34px', borderRadius: RADIUS.md,
              background: ELEV.sunken, border: `1px solid ${ELEV.hairline}`,
              color: COLORS.text, fontFamily: FONT, fontSize: FONT_SIZE.base, outline: 'none',
            }}
          />
        </div>

        {/* dynamic league chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Chip id="all" label={t('all_label')} />
          {leagues.map(l => <Chip key={l} id={l} label={l} />)}
        </div>

        <div style={{ flex: 1 }} />

        {/* count */}
        <span style={{ fontFamily: FONT, fontSize: FONT_SIZE.sm, fontWeight: 700, color: COLORS.textMuted, ...TNUM }}>
          {countLabel}
        </span>

        {/* New base layout — super_admin only (§ 96) */}
        {isSuper && (
          <Btn variant="accent" size="sm" onClick={onNew}>
            <Icons.Plus /> {t('layouts_new_base')}
          </Btn>
        )}
        <Btn variant="default" size="sm" onClick={onBrowse}>
          <Icons.Plus /> {t('layouts_browse_library')}
        </Btn>
      </div>

      {/* ── grid ── */}
      <div style={{ padding: '24px 28px 56px' }}>
        {loading && <SkeletonList count={3} />}

        {!loading && !layouts.length && (
          <EmptyState icon="🗺️" text={t('layouts_empty_add_first')} />
        )}

        {!loading && !!layouts.length && list.length === 0 && (
          <div style={{ padding: '64px 16px', textAlign: 'center', color: COLORS.textMuted, fontFamily: FONT, fontSize: FONT_SIZE.lg, fontWeight: 600 }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12, opacity: 0.6 }}>
              <RdIcon name="compass" size={30} />
            </div>
            {t('layouts_no_results')}
          </div>
        )}

        {!loading && list.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
            {list.map(l => {
              const c = LEAGUE_COLORS[l.league] || COLORS.textMuted;
              return (
                <div
                  key={l.id}
                  onClick={() => onOpen(l.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', borderRadius: RADIUS.xl, overflow: 'hidden',
                    background: ELEV.surface, border: `1px solid ${ELEV.hairline}`, boxShadow: ELEV.shadow1,
                    cursor: 'pointer',
                  }}
                >
                  {/* thumbnail — field image, or a placeholder tile when absent */}
                  <div style={{ height: 184, borderBottom: `1px solid ${ELEV.hairline}`, position: 'relative', background: ELEV.sunken }}>
                    {l.fieldImage ? (
                      <img src={l.fieldImage} alt={l.name} loading="lazy"
                        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: COLORS.textMuted }}>
                        <RdIcon name="map" size={34} />
                      </div>
                    )}
                  </div>

                  {/* meta */}
                  <div style={{ padding: '14px 16px 16px' }}>
                    <div style={{
                      fontFamily: FONT, fontSize: TYPE.title, fontWeight: 800, color: COLORS.text,
                      letterSpacing: TRACKING.tight,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      overflow: 'hidden', lineHeight: 1.25,
                    }}>{l.name}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      {l.league && (
                        <span style={{
                          fontFamily: FONT, fontSize: 11, fontWeight: 800, color: c,
                          background: `${c}1a`, border: `1px solid ${c}55`, borderRadius: RADIUS.sm, padding: '3px 8px',
                        }}>{l.league}</span>
                      )}
                      {l.year != null && (
                        <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: COLORS.textDim, ...TNUM }}>{l.year}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
